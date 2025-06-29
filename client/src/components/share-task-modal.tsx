import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X, Mail, Info, UserPlus } from "lucide-react";
import type { TaskWithDetails } from "@shared/schema";

interface ShareTaskModalProps {
  task: TaskWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareTaskModal({
  task,
  isOpen,
  onClose,
}: ShareTaskModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shareTaskMutation = useMutation({
    mutationFn: async ({
      email,
      permission,
    }: {
      email: string;
      permission: string;
    }) => {
      // In a real implementation, we would first look up or invite the user by email
      // For now, we'll assume the user exists with the email as their ID
      await apiRequest("POST", `/api/tasks/${task.id}/share`, {
        email: email, // This would be the actual user ID in production
        permission,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEmail("");
      setPermission("view");
      toast({
        title: "Task Shared",
        description: "An invitation has been sent to the user.",
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
        description: "Failed to share task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    shareTaskMutation.mutate({ email, permission });
  };

  const handleRemoveShare = async (shareId: number) => {
    try {
      await apiRequest("DELETE", `/api/tasks/${task.id}/shares/${shareId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Share removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove share.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Share Task</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-800 mb-1">{task.title}</h4>
            <p className="text-sm text-slate-600">
              {task.description || "No description available"}
            </p>
          </div>

          {/* Share Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="permission">Permission Level</Label>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Can Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={shareTaskMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {shareTaskMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </form>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Share via Email
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  The recipient will receive an email invitation to collaborate
                  on this task.
                </p>
              </div>
            </div>
          </div>

          {/* Current Shares */}
          {task.shares && task.shares.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                Shared with
              </h4>
              <div className="space-y-2">
                {task.shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={
                          share.user.profile_image_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            (share.user.first_name || "")
                              
                          )}&background=3B82F6&color=fff`
                        }
                        alt={`${share.user.first_name} `}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {share.user.first_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {share.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          share.permission === "edit" ? "default" : "secondary"
                        }
                      >
                        {share.permission === "edit" ? "Can Edit" : "View Only"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
