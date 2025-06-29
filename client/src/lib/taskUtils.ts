// src/lib/taskUtils.ts (or similar)
import { TaskWithDetails, User } from '@shared/schema';

export function getUserTaskPermission(task: TaskWithDetails, currentUserId: string): 'owner' | 'edit' | 'view' | 'none' {
  if (!currentUserId) {
    return 'none'; // No user logged in
  }

  if (task.ownerId === currentUserId) {
    return 'owner';
  }

  const share = task.shares.find(s => s.userId === currentUserId);
  if (share) {
    return share.permission as 'view' | 'edit';
  }

  return 'none';
}