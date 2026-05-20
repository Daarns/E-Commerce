import type { Order } from '@/types';
import { formatDateTime } from './format';

export function isOrderPaymentRetryable(order: Order): boolean {
  return order.order_status === 'pending' &&
    (order.payment_status === 'unpaid' ||
      order.payment_status === 'pending_payment' ||
      order.payment_status === 'failed');
}

export function isOrderPaymentSyncable(order: Order): boolean {
  return order.order_status === 'pending' &&
    order.payment_status !== 'paid' &&
    order.payment_status !== 'refunded';
}

export function getPaymentExpiryLabel(order: Order): string | null {
  if (!order.payment_expires_at || order.payment_status === 'paid') return null;

  const expiresAt = new Date(order.payment_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return null;

  if (expiresAt.getTime() <= Date.now()) {
    return 'Payment window expired';
  }

  return `Expires ${formatDateTime(expiresAt)}`;
}
