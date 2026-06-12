import { useCallback, useEffect, useState } from 'react';
import { adminService, AdminUser, getAdminUserErrorMessage, UserActivityLog } from '@/services/admin';
import { handleError } from '@/utils/error-handler';
import { toast } from 'sonner';

interface UseUserDetailReturn {
  user: AdminUser | null;
  activities: UserActivityLog[];
  isLoading: boolean;
  isSaving: boolean;
  handleRoleUpdate: (newRole: 'customer' | 'admin') => Promise<void>;
  handleStatusUpdate: (newStatus: 'active' | 'suspended' | 'banned', reason?: string) => Promise<void>;
}

export function useUserDetail(userId: string): UseUserDetailReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadUserData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [userData, activitiesData] = await Promise.all([
        adminService.getUser(userId),
        adminService.getUserActivityLog(userId, 20),
      ]);
      setUser(userData);
      setActivities(activitiesData);
    } catch (error) {
      handleError(error, { context: 'Failed to load user details' });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleRoleUpdate = async (newRole: 'customer' | 'admin'): Promise<void> => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateUserRole(user.id, newRole);
      setUser(updated);
    } catch (error) {
      toast.error(getAdminUserErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'active' | 'suspended' | 'banned', reason?: string): Promise<void> => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateUserStatus(user.id, newStatus, reason);
      setUser(updated);
    } catch (error) {
      toast.error(getAdminUserErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    user,
    activities,
    isLoading,
    isSaving,
    handleRoleUpdate,
    handleStatusUpdate,
  };
}
