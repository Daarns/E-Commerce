import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/stores/auth-store';
import type { Notification } from '@/types';

export function useNotificationMenu() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const [list, summary] = await Promise.all([
        notificationService.getNotifications(1, 10),
        notificationService.getSummary(),
      ]);
      setNotifications(list.notifications);
      setUnreadCount(summary.unread_count);
    } catch {
      toast.error('Gagal memuat notifikasi.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const markRead = useCallback(async (notificationId: string): Promise<void> => {
    await notificationService.markRead(notificationId);
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId
        ? { ...notification, read_at: new Date().toISOString() }
        : notification
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    await notificationService.markAllRead();
    const now = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({
      ...notification,
      read_at: notification.read_at ?? now,
    })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: loadNotifications,
    markRead,
    markAllRead,
  };
}
