import { Skeleton } from "@/components/ui/skeleton";
import TaskItem from "./task-item";
import { CheckCircle } from "lucide-react";
import type { TaskWithDetails, User } from "@shared/schema";

interface TaskListProps {
  tasks: TaskWithDetails[];
  isLoading: boolean;
  viewMode?: "list" | "grid";
  currentUser: User;
}

export default function TaskList({ tasks, isLoading, viewMode = "list", currentUser }: TaskListProps) {
  // *** ADD THESE CONSOLE.LOGS HERE ***
  console.log("TaskList: Received tasks:", tasks);
  console.log("TaskList: Received isLoading:", isLoading);
  // ***********************************
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">No tasks found</h3>
        <p className="text-slate-500">Create your first task to get started with task management.</p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} viewMode="grid" currentUser={currentUser} />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} viewMode="list" currentUser={currentUser} />
      ))}
    </div>
  );
}