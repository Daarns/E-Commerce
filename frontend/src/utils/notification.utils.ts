import type { Notification, User } from '@/types';

type NotificationMetadata = Record<string, unknown>;

export function parseNotificationMetadata(metadata: unknown): NotificationMetadata {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as NotificationMetadata
        : {};
    } catch {
      return {};
    }
  }
  return typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as NotificationMetadata
    : {};
}

function getStringMetadata(metadata: NotificationMetadata, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function getNotificationHref(notification: Notification, role?: User['role']): string {
  const metadata = parseNotificationMetadata(notification.metadata);
  const orderID = getStringMetadata(metadata, 'order_id');
  const orderNumber = getStringMetadata(metadata, 'order_number');

  switch (notification.type) {
  case 'chat_message':
    return role === 'admin' ? '/admin/chat' : '/chat';
  case 'refund_update':
    if (role === 'admin' && orderID) return `/admin/orders/refunds/${orderID}`;
    return orderNumber || orderID ? `/orders/${orderNumber ?? orderID}` : '/orders';
  case 'order_update':
  case 'payment_update':
    if (role === 'admin' && orderID) return `/admin/orders/${orderID}`;
    return orderNumber || orderID ? `/orders/${orderNumber ?? orderID}` : '/orders';
  case 'review_update':
    return role === 'admin' ? '/admin/reviews' : '/';
  default:
    return role === 'admin' ? '/admin' : '/';
  }
}
