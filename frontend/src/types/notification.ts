export interface Notification {
  id: string;
  user_id: string;
  type: 'chat_message' | 'order_update' | 'payment_update' | string;
  title: string;
  message: string;
  metadata?: unknown;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface NotificationSummary {
  unread_count: number;
}
