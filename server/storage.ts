import {
  users,
  tasks,
  taskShares,
  taskActivities,
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type TaskShare,
  type InsertTaskShare,
  type TaskActivity,
  type InsertTaskActivity,
  type TaskWithDetails as BaseTaskWithDetails,
  type TaskStats,
} from "@shared/schema";

// Extend TaskWithDetails to include sharedWith
type TaskWithDetails = BaseTaskWithDetails & {
  sharedWith: {
    userId: string;
    taskId: number;
    permission: string;
    user: User;
  }[];
};
import { db } from "./db"; // Assuming this is your Drizzle DB instance
import { eq, and, or, desc, asc, count, sql, inArray, ilike, gt, lt, gte, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Task operations
  getTasks(
    userId: string,
    filters?: {
      status?: string;
      priority?: string;
      dueDateFilter?: "" | "today" | "overdue" | "upcoming";
      search?: string;
      sortBy?: "dueDate" | "priority" | "created" | "title";
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    }
  ): Promise<{ tasks: TaskWithDetails[]; total: number }>;

  getTask(taskId: number, userId: string): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(
    taskId: number,
    userId: string,
    updates: Partial<InsertTask>
  ): Promise<Task | undefined>;
  deleteTask(taskId: number, userId: string): Promise<boolean>;

  // Task sharing operations
  shareTask(
    taskId: number,
    userEmail: string,
    permission: "view" | "edit"
  ): Promise<TaskShare>;
  getTaskShares(taskId: number): Promise<(TaskShare & { user: User })[]>;
  removeTaskShare(taskId: number, userId: string): Promise<boolean>;

  // Activity operations
  createActivity(activity: InsertTaskActivity): Promise<TaskActivity>;
  getTaskActivities(taskId: number): Promise<(TaskActivity & { user: User })[]>;

  // Analytics operations
  getTaskStats(userId: string): Promise<TaskStats>;
  getUserProductivity(
    userId: string,
    days?: number
  ): Promise<{ date: string; completed: number; created: number }[]>;
  getTeamPerformance(
    userId: string
  ): Promise<{ user: User; completedTasks: number; totalTasks: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    console.log("💥 upsertUser - received userData:", userData);

    const data = {
      id: String(userData.id),
      email: userData.email ?? "",
      first_name: userData.first_name ? String(userData.first_name) : "",
      profile_image_url: userData.profile_image_url
        ? String(userData.profile_image_url)
        : "",
    };

    console.log("💥 upsertUser - data prepared for Drizzle:", data);

    try {
      const [user] = await db
        .insert(users)
        .values(data)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: data.email,
            first_name: data.first_name,
            profile_image_url: data.profile_image_url,
            updated_at: new Date(),
          },
        })
        .returning();

      console.log("✅ upsertUser - User returned by Drizzle:", user);
      return user;
    } catch (error) {
      console.error("❌ Drizzle DB Error in upsertUser:", error);
      throw error;
    }
  }

  async getTasks(
    userId: string,
    filters: {
      status?: string;
      priority?: string;
      dueDateFilter?: "today" | "overdue" | "upcoming";
      search?: string;
      sortBy?: "dueDate" | "priority" | "created" | "title";
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ tasks: TaskWithDetails[]; total: number }> {
    console.log("Backend: getTasks called for userId:", userId);
    console.log("Backend: getTasks received filters:", filters); // DEBUG LOG

    const {
      search,
      status,
      priority,
      dueDateFilter,
      sortBy = "created",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = filters;

    console.log("Backend: Extracted status filter:", status); // DEBUG LOG

    const conditions = [];

    // 1. Ownership/Sharing Condition (always apply this)
    conditions.push(
      or(
        eq(tasks.ownerId, userId),
        sql`EXISTS (
          SELECT 1 FROM ${taskShares}
          WHERE ${taskShares.taskId} = ${tasks.id}
          AND ${taskShares.userId} = ${userId}
        )`
      )
    );

    // 2. Status Filter
    // Make sure 'status' is not an empty string, which often means "no filter"
    if (status && status !== "") {
      console.log(`Backend: Applying status filter: "${status}"`); // DEBUG LOG
      conditions.push(eq(tasks.status, status));
    }

    // 3. Priority Filter
    if (priority && priority !== "") {
      console.log(`Backend: Applying priority filter: "${priority}"`); // DEBUG LOG
      conditions.push(eq(tasks.priority, priority));
    }

    // 4. Due Date Filter
    if (dueDateFilter) {
      console.log(`Backend: Applying due date filter: "${dueDateFilter}"`); // DEBUG LOG
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      if (dueDateFilter === 'overdue') {
        // Tasks that are not completed and whose dueDate is in the past
        conditions.push(eq(tasks.status, 'pending')); // Only pending tasks can be overdue
        conditions.push(isNotNull(tasks.dueDate)); // Must have a due date
        conditions.push(lt(tasks.dueDate, now)); // Due date is strictly BEFORE today
      } else if (dueDateFilter === 'today') {
        // Tasks due today
        conditions.push(isNotNull(tasks.dueDate)); // Must have a due date
        conditions.push(gte(tasks.dueDate, now));
        conditions.push(lt(tasks.dueDate, new Date(now.getTime() + 24 * 60 * 60 * 1000))); // Less than start of tomorrow
      } else if (dueDateFilter === 'upcoming') {
        // Tasks due in the future (from tomorrow onwards)
        conditions.push(isNotNull(tasks.dueDate)); // Must have a due date
        conditions.push(gte(tasks.dueDate, new Date(now.getTime() + 24 * 60 * 60 * 1000)));
      }
    }

    // 5. Search Filter
    if (search && search !== "") {
      console.log(`Backend: Applying search filter: "${search}"`); // DEBUG LOG
      conditions.push(or(
        ilike(tasks.title, `%${search}%`),
        ilike(tasks.description, `%${search}%`)
      ));
    }

    // Determine sorting column
    let orderColumn;
    switch (sortBy) {
      case "dueDate":
        orderColumn = tasks.dueDate;
        break;
      case "priority":
        orderColumn = tasks.priority;
        break;
      case "title":
        orderColumn = tasks.title;
        break;
      case "created": // Use createdAt for 'created' sortBy
      default:
        orderColumn = tasks.createdAt;
        break; // Ensure default has a break
    }

    // Build the main query for fetching tasks
    const query = db
      .select({
        task: tasks,
        owner: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.ownerId, users.id))
      .where(and(...conditions)) // Apply ALL collected conditions here
      .orderBy(sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const results = await query;

    // Get total count using the same conditions
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(tasks)
      .leftJoin(users, eq(tasks.ownerId, users.id)) // Join users and taskShares for correct filtering in count
      .leftJoin(taskShares, eq(tasks.id, taskShares.taskId))
      .where(and(...conditions)); // Apply ALL collected conditions here


    const taskIds = results.map((r) => r.task.id);
    const shares =
      taskIds.length > 0
        ? await db
            .select({
              taskShare: taskShares,
              user: users,
            })
            .from(taskShares)
            .leftJoin(users, eq(taskShares.userId, users.id))
            .where(inArray(taskShares.taskId, taskIds))
        : [];

    const tasksWithDetails: TaskWithDetails[] = results.map(
      ({ task, owner }) => {
        const taskShares = shares
          .filter((s) => s.taskShare.taskId === task.id)
          .map((s) => ({ ...s.taskShare, user: s.user! }));

        return {
          ...task,
          owner: owner!, // Assuming owner will always be present for owned tasks
          shares: taskShares,
          sharedWith: taskShares.map((share) => ({
            userId: share.userId,
            taskId: share.taskId,
            permission: share.permission,
            user: share.user,
          })),
        };
      }
    );

    return { tasks: tasksWithDetails, total };
  }

  async getTask(
    taskId: number,
    userId: string
  ): Promise<TaskWithDetails | undefined> {
    const [result] = await db
      .select({
        task: tasks,
        owner: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.ownerId, users.id))
      .where(
        and(
          eq(tasks.id, taskId),
          or(
            eq(tasks.ownerId, userId),
            sql`EXISTS (
              SELECT 1 FROM ${taskShares}
              WHERE ${taskShares.taskId} = ${taskId}
              AND ${taskShares.userId} = ${userId}
            )`
          )
        )
      );

    if (!result) return undefined;

    const shares = await db
      .select({
        taskShare: taskShares,
        user: users,
      })
      .from(taskShares)
      .leftJoin(users, eq(taskShares.userId, users.id))
      .where(eq(taskShares.taskId, taskId));

    const sharesWithUser = shares.map((s) => ({ ...s.taskShare, user: s.user! }));
    return {
      ...result.task,
      owner: result.owner!,
      shares: sharesWithUser,
      sharedWith: sharesWithUser.map((share) => ({
        userId: share.userId,
        taskId: share.taskId,
        permission: share.permission,
        user: share.user,
      })),
    };
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(
    taskId: number,
    userId: string,
    updates: Partial<InsertTask>
  ): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, taskId),
          or(
            eq(tasks.ownerId, userId),
            sql`EXISTS (
              SELECT 1 FROM ${taskShares}
              WHERE ${taskShares.taskId} = ${taskId}
              AND ${taskShares.userId} = ${userId}
              AND ${taskShares.permission} = 'edit'
            )`
          )
        )
      )
      .returning();

    return updatedTask;
  }

  async deleteTask(taskId: number, userId: string): Promise<boolean> {
    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, userId)))
      .returning();

    return !!deletedTask;
  }

  async shareTask(
    taskId: number,
    userEmail: string,
    permission: "view" | "edit"
  ): Promise<TaskShare> {
    try {
      console.log(
        `Attempting to share task ${taskId} with email: ${userEmail} and permission: ${permission}`
      );

      // 1. Find the target user's actual Google Profile ID using their email
      const targetUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!targetUsers || targetUsers.length === 0) {
        console.warn(
          `User with email "${userEmail}" not found for sharing task ${taskId}.`
        );
        throw new Error(
          `User with email "${userEmail}" not found. Cannot share task.`
        );
      }

      const targetUserId = targetUsers[0].id; // This is the Google Profile ID

      // 2. Check if a share already exists for this task and user
      const existingShare = await db
        .select()
        .from(taskShares)
        .where(
          and(
            eq(taskShares.taskId, taskId),
            eq(taskShares.userId, targetUserId)
          )
        )
        .limit(1);

      if (existingShare.length > 0) {
        const currentShare = existingShare[0];
        if (currentShare.permission === permission) {
          console.log(
            `Task ${taskId} is already shared with ${userEmail} with the same permission: ${permission}. No update needed.`
          );
          return currentShare; // No change needed, return existing share
        } else {
          // Update the permission if it's different
          console.log(
            `Updating permission for task ${taskId} shared with ${userEmail} from ${currentShare.permission} to ${permission}.`
          );
          const [updatedShare] = await db
            .update(taskShares)
            .set({ permission: permission, createdAt: new Date() }) // Update createdAt to reflect modification time
            .where(eq(taskShares.id, currentShare.id))
            .returning();
          console.log(
            "Task share permission updated successfully:",
            updatedShare
          );
          return updatedShare;
        }
      }

      // 3. If no existing share, prepare and insert the new share
      const shareData: InsertTaskShare = {
        taskId: taskId,
        userId: targetUserId, // Use the FOUND Google Profile ID here!
        permission: permission,
      };

      console.log("Prepared new share data for Drizzle insert:", shareData);

      const [newShare] = await db
        .insert(taskShares)
        .values(shareData)
        .returning();

      console.log("New task shared successfully:", newShare);
      return newShare;
    } catch (error) {
      console.error("Error in shareTask storage method:", error);
      throw error; // Re-throw to propagate the error up to the route handler
    }
  }

  async getTaskShares(taskId: number): Promise<(TaskShare & { user: User })[]> {
    const shares = await db
      .select({
        taskShare: taskShares,
        user: users,
      })
      .from(taskShares)
      .leftJoin(users, eq(taskShares.userId, users.id))
      .where(eq(taskShares.taskId, taskId));

    return shares.map((s) => ({ ...s.taskShare, user: s.user! }));
  }

  async removeTaskShare(taskId: number, userId: string): Promise<boolean> {
    const [removedShare] = await db
      .delete(taskShares)
      .where(and(eq(taskShares.taskId, taskId), eq(taskShares.userId, userId)))
      .returning();

    return !!removedShare;
  }

  async createActivity(activity: InsertTaskActivity): Promise<TaskActivity> {
    const [newActivity] = await db
      .insert(taskActivities)
      .values(activity)
      .returning();
    return newActivity;
  }

  async getTaskActivities(
    taskId: number
  ): Promise<(TaskActivity & { user: User })[]> {
    const activities = await db
      .select({
        activity: taskActivities,
        user: users,
      })
      .from(taskActivities)
      .leftJoin(users, eq(taskActivities.userId, users.id))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt));

    return activities.map((a) => ({ ...a.activity, user: a.user! }));
  }

  async getTaskStats(userId: string): Promise<TaskStats> {
    const now = new Date();
    // Set 'today' to the start of the current day for consistent comparison
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Set 'startOfTomorrow' to define the upper bound for 'due today'
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const [stats] = await db
      .select({
        total: count(),
        completed: count(
          sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`
        ),
        inProgress: count(
          sql`CASE WHEN ${tasks.status} = 'in-progress' THEN 1 END`
        ),
        pending: count(sql`CASE WHEN ${tasks.status} = 'pending' THEN 1 END`),
        
        // Overdue tasks: dueDate is BEFORE startOfToday AND status is not 'completed'
        overdue: count(
          sql`CASE WHEN ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${startOfToday} AND ${tasks.status} != 'completed' THEN 1 END`
        ),
        
        // Tasks due today: dueDate is between startOfToday and startOfTomorrow AND status is not 'completed'
        dueToday: count(
          sql`CASE WHEN ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} >= ${startOfToday} AND ${tasks.dueDate} < ${startOfTomorrow} AND ${tasks.status} != 'completed' THEN 1 END`
        ),

        highPriority: count(
          sql`CASE WHEN ${tasks.priority} = 'high' THEN 1 END`
        ),
        mediumPriority: count(
          sql`CASE WHEN ${tasks.priority} = 'medium' THEN 1 END`
        ),
        lowPriority: count(sql`CASE WHEN ${tasks.priority} = 'low' THEN 1 END`),
      })
      .from(tasks)
      .where(
        or(
          eq(tasks.ownerId, userId),
          sql`EXISTS (
            SELECT 1 FROM ${taskShares}
            WHERE ${taskShares.taskId} = ${tasks.id}
            AND ${taskShares.userId} = ${userId}
          )`
        )
      );

    return {
      total: stats.total,
      completed: stats.completed,
      inProgress: stats.inProgress,
      pending: stats.pending,
      overdue: stats.overdue,
      // Add the new dueToday stat here
      dueToday: stats.dueToday,
      highPriority: stats.highPriority,
      mediumPriority: stats.mediumPriority,
      lowPriority: stats.lowPriority,
    };
  }

  async getUserProductivity(
    userId: string,
    days: number = 7
  ): Promise<{ date: string; completed: number; created: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const productivity = await db
      .select({
        date: sql<string>`DATE(${tasks.createdAt})`,
        completed: count(
          sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`
        ),
        created: count(),
      })
      .from(tasks)
      .where(
        and(
          or(
            eq(tasks.ownerId, userId),
            sql`EXISTS (
              SELECT 1 FROM ${taskShares}
              WHERE ${taskShares.taskId} = ${tasks.id}
              AND ${taskShares.userId} = ${userId}
            )`
          ),
          sql`${tasks.createdAt} >= ${startDate}`,
          sql`${tasks.createdAt} <= ${endDate}`
        )
      )
      .groupBy(sql`DATE(${tasks.createdAt})`)
      .orderBy(sql`DATE(${tasks.createdAt})`);

    return productivity;
  }

  async getTeamPerformance(
    userId: string
  ): Promise<{ user: User; completedTasks: number; totalTasks: number }[]> {
    const performance = await db
      .select({
        user: users,
        completedTasks: count(
          sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`
        ),
        totalTasks: count(),
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.ownerId, users.id))
      .where(
        sql`EXISTS (
          SELECT 1 FROM ${taskShares} ts1
          WHERE ts1.taskId = ${tasks.id}
          AND ts1.userId = ${userId}
        ) OR ${tasks.ownerId} = ${userId}`
      )
      .groupBy(users.id)
      .having(sql`count(*) > 0`);

    return performance.map((p) => ({
      user: p.user!,
      completedTasks: p.completedTasks,
      totalTasks: p.totalTasks,
    }));
  }
}

export const storage = new DatabaseStorage();