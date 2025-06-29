import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertTaskSchema, insertTaskShareSchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Express.Request {
  user?: any;
}

interface WebSocketClient extends WebSocket {
  userId?: string;
  taskId?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        dueDateFilter: req.query.dueDateFilter as 'today' | 'overdue' | 'upcoming',
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'dueDate' | 'priority' | 'created' | 'title',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await storage.getTasks(userId, filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const task = await storage.getTask(taskId, userId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taskData = insertTaskSchema.parse({
        ...req.body,
        ownerId: userId,
      });

      const task = await storage.createTask(taskData);
      
      // Create activity
      await storage.createActivity({
        taskId: task.id,
        userId: userId,
        action: "created",
        details: { title: task.title },
      });

      // Broadcast to WebSocket clients
      broadcastTaskUpdate(task.id, {
        type: "task_created",
        task,
        user: req.user,
      });

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
         console.error("❌ Zod Validation Errors during task creation:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Validate update data
      const updateData = insertTaskSchema.partial().parse(req.body);
      
      const updatedTask = await storage.updateTask(taskId, userId, updateData);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found or access denied" });
      }

      // Create activity
      await storage.createActivity({
        taskId: taskId,
        userId: userId,
        action: "updated",
        details: updateData,
      });

      // Broadcast to WebSocket clients
      broadcastTaskUpdate(taskId, {
        type: "task_updated",
        task: updatedTask,
        user: req.user,
        changes: updateData,
      });

      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const deleted = await storage.deleteTask(taskId, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found or access denied" });
      }

      // Broadcast to WebSocket clients
      broadcastTaskUpdate(taskId, {
        type: "task_deleted",
        taskId,
        user: req.user,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  const shareRequestBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  permission: z.enum(["view", "edit"], {
    errorMap: (issue, ctx) => {
      return { message: "Permission must be 'view' or 'edit'" };
    },
  }),
});
  // Task sharing routes
  app.post('/api/tasks/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const ownerId = req.user.id; // This is the ID of the person SHARING the task

      // Validate taskId
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid Task ID" });
      }

      // Validate the request body using the new schema
      const { email, permission } = shareRequestBodySchema.parse(req.body); // Frontend sends email and permission

      // Check if user owns the task
      const task = await storage.getTask(taskId, ownerId);
      if (!task || task.ownerId !== ownerId) {
        return res.status(403).json({ message: "Only task owner can share tasks" });
      }

      // Ensure a user cannot share a task with themselves (optional, but good practice)
      if (email === req.user.email) { // Assuming req.user also has email
          return res.status(400).json({ message: "Cannot share a task with yourself." });
      }

      // Call the NEW shareTask method, passing the required data directly
      const share = await storage.shareTask(taskId, email, permission);

      // Create activity
      await storage.createActivity({
        taskId: taskId,
        userId: ownerId, // The person who performed the sharing action
        action: "shared",
        details: { sharedWith: email, permission: permission }, // Log the email for sharedWith
      });

      res.status(201).json(share);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod Validation Errors for share data:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid share data", errors: error.errors });
      }
      console.error("Error sharing task:", error);
      // Catch the specific error from storage.shareTask for "User not found"
      if (typeof error === "object" && error !== null && "message" in error && typeof (error as any).message === "string" && (error as any).message.includes("User with email")) {
          return res.status(404).json({ message: (error as any).message });
      }
      res.status(500).json({ message: "Failed to share task" });
    }
});

  app.get('/api/tasks/:id/shares', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user has access to the task
      const task = await storage.getTask(taskId, userId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const shares = await storage.getTaskShares(taskId);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching task shares:", error);
      res.status(500).json({ message: "Failed to fetch task shares" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getTaskStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/analytics/productivity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const productivity = await storage.getUserProductivity(userId, days);
      res.json(productivity);
    } catch (error) {
      console.error("Error fetching productivity:", error);
      res.status(500).json({ message: "Failed to fetch productivity data" });
    }
  });

  app.get('/api/analytics/team', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const teamPerformance = await storage.getTeamPerformance(userId);
      res.json(teamPerformance);
    } catch (error) {
      console.error("Error fetching team performance:", error);
      res.status(500).json({ message: "Failed to fetch team performance" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, Set<WebSocketClient>>();

  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          ws.userId = data.userId;
          
          if (!clients.has(data.userId)) {
            clients.set(data.userId, new Set());
          }
          clients.get(data.userId)!.add(ws);
          
          ws.send(JSON.stringify({ type: 'auth_success' }));
        } else if (data.type === 'join_task') {
          ws.taskId = data.taskId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId && clients.has(ws.userId)) {
        clients.get(ws.userId)!.delete(ws);
        if (clients.get(ws.userId)!.size === 0) {
          clients.delete(ws.userId);
        }
      }
    });
  });

  // Broadcast function for task updates
  function broadcastTaskUpdate(taskId: number, data: any) {
    clients.forEach((userClients) => {
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            ...data,
            taskId,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    });
  }

  // Make broadcast function available globally for this module
  (global as any).broadcastTaskUpdate = broadcastTaskUpdate;

  return httpServer;
}
