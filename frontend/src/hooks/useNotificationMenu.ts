import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/stores/auth-store';
import type { Notification } from '@/types';
import { getNotificationHref } from '@/utils/notification.utils';

const NOTIFICATION_PAGE_SIZE = 7;
const MAX_DROPDOWN_NOTIFICATIONS = 35;

export function useNotificationMenu() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const loadNotifications = useCallback(async (nextPage = 1): Promise<void> => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setTotalPages(0);
      return;
    }

    setIsLoading(true);
    try {
      const [list, summary] = await Promise.all([
        notificationService.getNotifications(nextPage, NOTIFICATION_PAGE_SIZE, true),
        notificationService.getSummary(),
      ]);
      setNotifications((current) => (
        nextPage === 1 ? list.notifications : [...current, ...list.notifications]
      ));
      setUnreadCount(summary.unread_count);
      setPage(list.page);
      setTotalPages(list.total_pages);
    } catch {
      toast.error('Gagal memuat notifikasi.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadNotifications(1);
    const timer = window.setInterval(() => {
      void loadNotifications(1);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const markRead = useCallback(async (notificationId: string): Promise<void> => {
    await notificationService.markRead(notificationId);
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    await notificationService.markAllRead();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      isLoading ||
      notifications.length >= MAX_DROPDOWN_NOTIFICATIONS ||
      (totalPages > 0 && page >= totalPages)
    ) return;
    await loadNotifications(page + 1);
  }, [isLoading, loadNotifications, notifications.length, page, totalPages]);

  const openNotification = useCallback(async (notification: Notification): Promise<void> => {
    const href = getNotificationHref(notification, user?.role);
    try {
      await markRead(notification.id);
    } catch {
      toast.error('Notifikasi belum bisa ditandai terbaca.');
    }
    router.push(href);
  }, [markRead, router, user?.role]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore: notifications.length < MAX_DROPDOWN_NOTIFICATIONS && totalPages > 0 && page < totalPages,
    refresh: () => loadNotifications(1),
    markRead,
    markAllRead,
    loadMore,
    openNotification,
  };
}
