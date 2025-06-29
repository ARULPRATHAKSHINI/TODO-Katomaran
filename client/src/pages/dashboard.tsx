import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import TaskList from "@/components/task-list";
import TaskForm from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search, Plus, List, Grid3X3, CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import type { TaskStats, TaskWithDetails } from "@shared/schema";
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    dueDateFilter: "",
  });

  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, lastMessage } = useWebSocket();

  // Fetch task statistics
  const { data: stats } = useQuery<TaskStats>({
    queryKey: ["/api/analytics/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery<{ tasks: TaskWithDetails[]; total: number }>({
    queryKey: [
      "/api/tasks",
      {
        search: searchQuery,
        sortBy,
        sortOrder,
        ...filters,
        page: 1,
        limit: 20
      }
    ],
    // Logging can be handled in onError and onSuccess if needed
    queryFn: async ({ queryKey }) => {
      const [_key, params] = queryKey as [string, Record<string, unknown>];
      const urlParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        if (value !== "" && value !== undefined && value !== null) {
          urlParams.append(key, String(value));
        }
      }

      const queryString = urlParams.toString();
      const url = `/api/tasks${queryString ? `?${queryString}` : ""}`;
      
      const response = await apiRequest("GET", url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Explicitly type the returned data
      return await response.json() as { tasks: TaskWithDetails[]; total: number };
    },
  });

  console.log("Dashboard: tasksData received from API:", tasksData);
  console.log("Dashboard: tasks array passed to TaskList:", tasksData?.tasks);
  console.log("Dashboard: isLoading state:", isLoading);
  
  // Create task mutation
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

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "task_created" ||
        lastMessage.type === "task_updated" ||
        lastMessage.type === "task_deleted") {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });

        const actionText = lastMessage.type === "task_created" ? "created" :
          lastMessage.type === "task_updated" ? "updated" : "deleted";

        toast({
          title: "Task Updated",
          description: `A task was ${actionText} by ${lastMessage.user?.firstName || 'someone'}.`,
        });
      }
    }
  }, [lastMessage, queryClient, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleFilterChange = (newFilters: { status?: string, priority?: string, dueDateFilter?: string }) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const handleStatCardClick = (type: 'status' | 'priority' | 'dueDateFilter' | 'allTasks', value: string) => {
    let newFilters: { status?: string, priority?: string, dueDateFilter?: string } = {};

    if (type === 'allTasks') {
      newFilters = { status: "", dueDateFilter: "", priority: "" };
    } else if (type === 'status') {
      newFilters = { status: value, dueDateFilter: "", priority: "" };
    } else if (type === 'dueDateFilter') {
      newFilters = { dueDateFilter: value, status: "", priority: "" };
    } else if (type === 'priority') {
      // For priority, we layer it on existing filters, unless it's 'all'
      newFilters = {
        status: filters.status,
        dueDateFilter: filters.dueDateFilter,
        priority: value,
      };
    }

    // --- DEBUG LOG ---
    console.log("Dashboard: handleStatCardClick - Setting new filters:", newFilters);
    // --- END DEBUG LOG ---

    setFilters({
      status: newFilters.status ?? "",
      priority: newFilters.priority ?? "",
      dueDateFilter: newFilters.dueDateFilter ?? "",
    });
  };


  if (!currentUser) {
    return <div>Loading user...</div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex">
        <Sidebar
          onFilterChange={handleFilterChange}
          activeFilters={filters}
          stats={stats}
        />

        <main className="flex-1 p-6 mobile-bottom-padding">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-600 mt-1 flex items-center">
                Manage your tasks efficiently
                {isConnected && (
                  <span className="ml-3 flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-700 font-medium">Live</span>
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </form>

              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split("-");
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created-desc">Newest First</SelectItem>
                  <SelectItem value="created-asc">Oldest First</SelectItem>
                  <SelectItem value="dueDate-asc">Due Date (Earliest)</SelectItem>
                  <SelectItem value="dueDate-desc">Due Date (Latest)</SelectItem>
                  <SelectItem value="priority-desc">High Priority First</SelectItem>
                  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats - Made Clickable */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatCardClick("allTasks", "")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Tasks</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatCardClick("status", "completed")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Completed</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.completed}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className="text-green-600 font-medium">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                    <span className="text-slate-500 ml-1">completion rate</span>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatCardClick("status", "in-progress")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">In Progress</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.inProgress}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className="text-yellow-600 font-medium">Active</span>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatCardClick("dueDateFilter", "overdue")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Overdue</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.overdue}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className="text-red-600 font-medium">
                      {stats.overdue > 0 ? "Needs attention" : "All clear"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Task List */}
          <Card>
            <CardHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Tasks</h2>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
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
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <TaskList
                tasks={tasksData?.tasks || []}
                isLoading={isLoading}
                viewMode={viewMode}
                currentUser={currentUser}
              />

              {tasksData && tasksData.total > 20 && (
                <div className="flex items-center justify-center mt-6">
                  <Button variant="outline">
                    Load More ({tasksData.total - 20} remaining)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 text-slate-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Analytics</span>
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="flex flex-col items-center space-y-1 w-12 h-12 rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </div>
  );
}