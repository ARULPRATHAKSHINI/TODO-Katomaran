// components/sidebar.tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TaskForm from "./task-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import { Plus, List, Calendar, AlertTriangle, Play, CheckCircle } from "lucide-react";
import type { TaskStats } from "@shared/schema";

interface SidebarProps {
  onFilterChange?: (newFilters: { status?: string, priority?: string, dueDateFilter?: string }) => void;
  activeFilters?: Record<string, string>;
  stats?: TaskStats;
}

export default function Sidebar({ onFilterChange, activeFilters = {}, stats }: SidebarProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      setIsCreateModalOpen(false);
      toast({
        title: "Success",
        description: "Task created successfully!",
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
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFilterClick = (type: 'status' | 'dueDateFilter' | 'allTasks', value: string) => {
    if (onFilterChange) {
      // Define the base filter object, clearing previous status and dueDate filters
      let newFilters: { status?: string, dueDateFilter?: string, priority?: string } = {
        status: "",
        dueDateFilter: "",
        // Keep the current priority filter if one is active, otherwise clear it
        priority: activeFilters.priority || "",
      };

      if (type === 'allTasks') {
        // All tasks means clear everything
        newFilters = { status: "", dueDateFilter: "", priority: "" };
      } else if (type === 'status') {
        newFilters.status = value;
      } else if (type === 'dueDateFilter') {
        newFilters.dueDateFilter = value;
      }
      onFilterChange(newFilters);
    }
  };

  const handlePriorityFilterClick = (value: string) => {
    if (onFilterChange) {
      // Priority filter can often be combined with status/dueDate, so we preserve them.
      // But if "all" priority is selected, clear it.
      const newFilters = {
        status: activeFilters.status || "",
        dueDateFilter: activeFilters.dueDateFilter || "",
        priority: value === "all" ? "" : value
      };
      onFilterChange(newFilters);
    }
  };


  // Helper to check if a filter type is active for button highlighting
  const isActive = (filterType: string, value: string) => {
    if (filterType === 'status') {
      return activeFilters.status === value && !activeFilters.dueDateFilter && !activeFilters.priority;
    }
    if (filterType === 'dueDateFilter') {
      return activeFilters.dueDateFilter === value && !activeFilters.status && !activeFilters.priority;
    }
    if (filterType === 'priority') {
      return activeFilters.priority === value;
    }
    // For 'All Tasks' button
    if (filterType === 'allTasks') {
      return !activeFilters.status && !activeFilters.dueDateFilter && !activeFilters.priority;
    }
    return false;
  };


  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 hidden lg:block">
      <div className="p-6">
        {/* Quick Actions */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              onSubmit={(data) => createTaskMutation.mutate(data)}
              isLoading={createTaskMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Views</h3>
            <div className="space-y-1">
              <Button
                variant={isActive('allTasks', '') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleFilterClick("allTasks", "")}
              >
                <List className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">All Tasks</span>
                <span className="text-xs bg-white px-2 py-1 rounded-full">
                  {stats?.total || 0}
                </span>
              </Button>

              <Button
                variant={isActive('dueDateFilter', 'today') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleFilterClick("dueDateFilter", "today")}
              >
                <Calendar className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">Due Today</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  {/* Needs to come from backend stats */}
                  0
                </span>
              </Button>

              <Button
                variant={isActive('dueDateFilter', 'overdue') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleFilterClick("dueDateFilter", "overdue")}
              >
                <AlertTriangle className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">Overdue</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  {stats?.overdue || 0}
                </span>
              </Button>

              <Button
                variant={isActive('status', 'in-progress') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleFilterClick("status", "in-progress")}
              >
                <Play className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">In Progress</span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  {stats?.inProgress || 0}
                </span>
              </Button>

              <Button
                variant={isActive('status', 'completed') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleFilterClick("status", "completed")}
              >
                <CheckCircle className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">Completed</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {stats?.completed || 0}
                </span>
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Priority</h3>
            <div className="space-y-1">
              <Button
                variant={isActive('priority', 'high') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handlePriorityFilterClick("high")}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="flex-1 text-left">High Priority</span>
                <span className="text-xs">{stats?.highPriority || 0}</span>
              </Button>

              <Button
                variant={isActive('priority', 'medium') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handlePriorityFilterClick("medium")}
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="flex-1 text-left">Medium Priority</span>
                <span className="text-xs">{stats?.mediumPriority || 0}</span>
              </Button>

              <Button
                variant={isActive('priority', 'low') ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handlePriorityFilterClick("low")}
              >
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="flex-1 text-left">Low Priority</span>
                <span className="text-xs">{stats?.lowPriority || 0}</span>
              </Button>
              <Button
                variant={activeFilters.priority === "" ? "default" : "ghost"} // Highlight 'All Priorities' when no priority is selected
                className="w-full justify-start"
                onClick={() => handlePriorityFilterClick("all")}
              >
                <List className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">All Priorities</span>
                <span className="text-xs">{stats?.total || 0}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}