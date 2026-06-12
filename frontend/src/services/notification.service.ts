import api from '@/services/api';
import type { ApiResponse, NotificationListResponse, NotificationSummary } from '@/types';

export const notificationService = {
  async getNotifications(page = 1, limit = 10, unreadOnly = false): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (unreadOnly) {
      params.set('unread', 'true');
    }

    const response = await api.get<ApiResponse<NotificationListResponse>>(
      `/notifications?${params.toString()}`
    );
    return response.data.data ?? {
      notifications: [],
      total: 0,
      page,
      page_size: limit,
      total_pages: 0,
    };
  },

  async getSummary(): Promise<NotificationSummary> {
    const response = await api.get<ApiResponse<NotificationSummary>>('/notifications/summary');
    return response.data.data ?? { unread_count: 0 };
  },

  async markRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await api.put('/notifications/read-all', {});
  },
};
