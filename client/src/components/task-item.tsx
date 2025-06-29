import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TaskForm from "./task-form"; // This is your edit modal content
import ShareTaskModal from "./share-task-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";
import { MoreHorizontal, Share2, Edit, Trash2, Calendar, User as UserIcon } from "lucide-react";
import type { TaskWithDetails, User } from "@shared/schema";

// Import the new utility function
import { getUserTaskPermission } from "@/lib/taskUtils";

interface TaskItemProps {
  task: TaskWithDetails;
  viewMode?: "list" | "grid";
  currentUser: User; // Added this prop
}

export default function TaskItem({ task, viewMode = "list", currentUser }: TaskItemProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine user's permission for this task
  const userPermission = getUserTaskPermission(task, currentUser.id);
  const canEdit = userPermission === 'owner' || userPermission === 'edit';
  const canDelete = userPermission === 'owner'; // Only owner can delete
  const canToggleStatus = userPermission === 'owner' || userPermission === 'edit'; // Owner or editor can toggle status

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<TaskWithDetails>) => {
      // Add a client-side check just in case, though UI should prevent this
      if (!canEdit) {
        toast({ title: "Access Denied", description: "You do not have permission to edit this task.", variant: "destructive" });
        throw new Error("Access Denied");
      }
      await apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Task updated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      // Client-side check for deletion permission
      if (!canDelete) {
        toast({ title: "Access Denied", description: "Only the task owner can delete this task.", variant: "destructive" });
        throw new Error("Access Denied");
      }
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      toast({
        title: "Success",
        description: "Task deleted successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusToggle = (checked: boolean) => {
    if (!canToggleStatus) { // Prevent toggling if no permission
      toast({ title: "Access Denied", description: "You do not have permission to change the status of this task.", variant: "destructive" });
      return;
    }
    const newStatus = checked ? "completed" : "pending";
    updateTaskMutation.mutate({
      status: newStatus,
      completedAt: checked ? new Date() : undefined
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="status-completed">Completed</Badge>;
      case "in-progress":
        return <Badge className="status-in-progress">In Progress</Badge>;
      case "pending":
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";

  // Helper function to render common task details for both list and grid views
  const renderTaskDetails = (isGrid: boolean) => (
    <>
      <div className="flex items-start space-x-3 mb-3">
        <Checkbox
          checked={task.status === "completed"}
          onCheckedChange={handleStatusToggle}
          disabled={updateTaskMutation.isPending || !canToggleStatus} // Disable based on permission
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className={`font-medium truncate ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-800"}`}>
              {task.title}
            </h4>
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
          </div>
          {task.description && (
            <p className={`text-sm text-slate-500 ${isGrid ? "line-clamp-2" : "truncate max-w-md"} mb-2`}>{task.description}</p>
          )}
          <div className={`flex items-center ${isGrid ? "justify-between" : "space-x-4 mt-1"}`}>
            {getStatusBadge(task.status)}
            {task.dueDate && (
              <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-slate-400"}`}>
                <Calendar className={`h-3 w-3 mr-1 ${isGrid ? "inline" : ""}`} />
                {isOverdue ? "Overdue: " : "Due: "}
                {format(new Date(task.dueDate), isGrid ? "MMM d" : "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        {!isGrid && ( // Only show owner avatar and dropdown in list view directly in this section
          <div className="flex items-center space-x-3">
            {task.owner && (
              <img
                src={task.owner.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((task.owner.first_name || ''))}&background=3B82F6&color=fff`}
                alt="Owner"
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsShareModalOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {canEdit && ( // Conditionally render Edit
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && ( // Conditionally render Delete
                  <DropdownMenuItem
                    onClick={() => deleteTaskMutation.mutate()}
                    className="text-red-600"
                    disabled={deleteTaskMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isGrid && ( // Additional info for grid view below the main content
        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
          {task.owner && (
            <div className="flex items-center space-x-1">
              <UserIcon className="h-3 w-3" />
              <img
                src={task.owner.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((task.owner.first_name || ''))}&background=3B82F6&color=fff`}
                alt="Owner"
                className="w-4 h-4 rounded-full"
              />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsShareModalOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              {canEdit && ( // Conditionally render Edit
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && ( // Conditionally render Delete
                <DropdownMenuItem
                  onClick={() => deleteTaskMutation.mutate()}
                  className="text-red-600"
                  disabled={deleteTaskMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Sharing Status Badges (Always visible to indicate share status) */}
      <div className="flex items-center space-x-2 mt-2">
        {userPermission === 'owner' && (
          <Badge className="bg-blue-100 text-blue-800">Your Task</Badge>
        )}
        {userPermission === 'view' && (
          <Badge variant="secondary">Shared (View Only)</Badge>
        )}
        {userPermission === 'edit' && (
          <Badge variant="default">Shared (Can Edit)</Badge>
        )}
        {task.ownerId !== currentUser.id && task.owner && (
          <span className="text-xs text-gray-500">
            Shared by: {task.owner.first_name}
          </span>
        )}
        {task.shares.length > 0 && userPermission === 'owner' && (
            <span className="text-xs text-gray-500">
                ({task.shares.length} Share{task.shares.length > 1 ? 's' : ''})
            </span>
        )}
      </div>
    </>
  );


  if (viewMode === "grid") {
    return (
      <>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {renderTaskDetails(true)}
          </CardContent>
        </Card>

        {/* Modals */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              defaultValues={{
                title: task.title,
                description: task.description || "",
                priority: task.priority,
                status: task.status,
                dueDate: task.dueDate ? new Date(task.dueDate) : null, // Pass a Date object or null
              }}
              onSubmit={(data) => updateTaskMutation.mutate(data)}
              isLoading={updateTaskMutation.isPending}
              canEdit={canEdit} // Pass canEdit to TaskForm
            />
          </DialogContent>
        </Dialog>

        <ShareTaskModal
          task={task}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
        {renderTaskDetails(false)}
      </div>

      {/* Modals */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            defaultValues={{
              title: task.title,
              description: task.description || "",
              priority: task.priority,
              status: task.status,
              dueDate: task.dueDate ? new Date(task.dueDate) : null, // Pass a Date object or null
            }}
            onSubmit={(data) => updateTaskMutation.mutate(data)}
            isLoading={updateTaskMutation.isPending}
            canEdit={canEdit}
          />
        </DialogContent>
      </Dialog>

      <ShareTaskModal
        task={task}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </>
  );
}