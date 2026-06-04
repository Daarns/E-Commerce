import type { OrderStatus, PaymentStatus } from '@/types';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
];

export const ORDER_TIMELINE_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'refund_requested',
  'refund_rejected',
  'cancelled',
  'refunded',
];

export const SHOP_ORDER_STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'refund_requested', label: 'Refund Requested' },
  { value: 'refund_rejected', label: 'Refund Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  payment_confirmed: 'Payment Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  refund_requested: 'Refund Requested',
  refund_rejected: 'Refund Rejected',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ADMIN_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ...ORDER_STATUS_LABELS,
  payment_confirmed: 'Confirmed',
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: 'Order placed and waiting for payment',
  payment_confirmed: 'Payment confirmed and order being prepared',
  processing: 'Items are being packed',
  shipped: 'Package is on the way',
  delivered: 'Package has arrived and is waiting for customer confirmation',
  completed: 'Order completed after customer confirmation',
  refund_requested: 'Refund request submitted and waiting for admin review',
  refund_rejected: 'Refund request rejected after admin review',
  cancelled: 'Order has been cancelled',
  refunded: 'Order refunded',
};

export const ORDER_STATUS_BADGE_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  payment_confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  refund_requested: 'bg-orange-100 text-orange-800',
  refund_rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export const SHOP_ORDER_STATUS_BADGE_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  payment_confirmed: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  refund_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  refund_rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  pending_payment: 'Pending Payment',
  failed: 'Failed',
  refunded: 'Refunded',
  expired: 'Expired',
};

export const PAYMENT_STATUS_BADGE_COLORS: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-yellow-100 text-yellow-800',
  pending_payment: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800',
};

export const PAYMENT_STATUS_PANEL_COLORS: Record<PaymentStatus, string> = {
  paid: 'bg-green-50 border-green-200',
  unpaid: 'bg-yellow-50 border-yellow-200',
  pending_payment: 'bg-yellow-50 border-yellow-200',
  failed: 'bg-red-50 border-red-200',
  refunded: 'bg-blue-50 border-blue-200',
  expired: 'bg-red-50 border-red-200',
};

export const ADMIN_ORDER_STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: ADMIN_ORDER_STATUS_LABELS.pending },
  { value: 'payment_confirmed', label: ADMIN_ORDER_STATUS_LABELS.payment_confirmed },
  { value: 'processing', label: ADMIN_ORDER_STATUS_LABELS.processing },
  { value: 'shipped', label: ADMIN_ORDER_STATUS_LABELS.shipped },
  { value: 'delivered', label: ADMIN_ORDER_STATUS_LABELS.delivered },
  { value: 'completed', label: ADMIN_ORDER_STATUS_LABELS.completed },
  { value: 'refund_requested', label: ADMIN_ORDER_STATUS_LABELS.refund_requested },
  { value: 'refund_rejected', label: ADMIN_ORDER_STATUS_LABELS.refund_rejected },
  { value: 'cancelled', label: ADMIN_ORDER_STATUS_LABELS.cancelled },
  { value: 'refunded', label: ADMIN_ORDER_STATUS_LABELS.refunded },
] as const;

export const ADMIN_PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: 'paid', label: PAYMENT_STATUS_LABELS.paid },
  { value: 'unpaid', label: PAYMENT_STATUS_LABELS.unpaid },
  { value: 'pending_payment', label: PAYMENT_STATUS_LABELS.pending_payment },
  { value: 'failed', label: PAYMENT_STATUS_LABELS.failed },
  { value: 'refunded', label: PAYMENT_STATUS_LABELS.refunded },
  { value: 'expired', label: PAYMENT_STATUS_LABELS.expired },
] as const;

export const ADMIN_ORDER_STATUS_CHART_CONFIG = [
  { key: 'pending_orders', label: 'Pending', color: '#EAB308' },
  { key: 'processing_orders', label: 'Diproses', color: '#3B82F6' },
  { key: 'shipped_orders', label: 'Dikirim', color: '#A855F7' },
  { key: 'delivered_orders', label: 'Terkirim', color: '#22C55E' },
  { key: 'cancelled_orders', label: 'Dibatalkan', color: '#EF4444' },
] as const;
