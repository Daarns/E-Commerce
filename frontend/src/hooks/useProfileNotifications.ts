import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/stores/auth-store';
import type { Notification } from '@/types';
import { getNotificationHref } from '@/utils/notification.utils';

const PROFILE_NOTIFICATION_PAGE_SIZE = 10;
const PROFILE_NOTIFICATION_MAX_ITEMS = 100;

export function useProfileNotifications(isEnabled: boolean) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const maxPages = useMemo(
    () => Math.ceil(PROFILE_NOTIFICATION_MAX_ITEMS / PROFILE_NOTIFICATION_PAGE_SIZE),
    []
  );

  const loadNotifications = useCallback(async (nextPage: number): Promise<void> => {
    if (!isEnabled) return;
    setIsLoading(true);
    try {
      const result = await notificationService.getNotifications(
        nextPage,
        PROFILE_NOTIFICATION_PAGE_SIZE,
        false
      );
      setNotifications(result.notifications);
      setPage(result.page);
      setTotalPages(Math.min(result.total_pages, maxPages));
      setTotal(Math.min(result.total, PROFILE_NOTIFICATION_MAX_ITEMS));
    } catch {
      toast.error('Gagal memuat riwayat notifikasi.');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, maxPages]);

  useEffect(() => {
    if (!isEnabled) return;
    void loadNotifications(1);
  }, [isEnabled, loadNotifications]);

  const openNotification = useCallback(async (notification: Notification): Promise<void> => {
    const href = getNotificationHref(notification, user?.role);
    if (!notification.read_at) {
      try {
        await notificationService.markRead(notification.id);
      } catch {
        toast.error('Notifikasi belum bisa ditandai terbaca.');
      }
    }
    router.push(href);
  }, [router, user?.role]);

  return {
    notifications,
    page,
    totalPages,
    total,
    isLoading,
    canGoPrevious: page > 1,
    canGoNext: page < totalPages,
    loadPage: loadNotifications,
    openNotification,
  };
}
