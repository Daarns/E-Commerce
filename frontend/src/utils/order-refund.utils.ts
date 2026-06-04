import type { Order, OrderStatusHistory } from '@/types';
import { CUSTOMER_REFUND_REASON_OPTIONS } from '@/constants/refund.constants';

export interface RefundRequestInfo {
  reason: string;
  description: string;
  attemptNumber: number;
  requestedAt?: string;
}

const REFUND_REASON_PREFIX = 'Refund requested by customer. Reason: ';
const REFUND_DESCRIPTION_SEPARATOR = '. Description: ';

export function getRefundRequestInfo(order: Order): RefundRequestInfo {
  const event = getRefundRequestEvent(order.status_history);
  const notes = event?.notes ?? '';

  if (!notes.startsWith(REFUND_REASON_PREFIX)) {
    return {
      reason: toCustomerRefundReasonLabel(notes),
      description: '',
      attemptNumber: getRefundRequestAttemptNumber(order.status_history),
      requestedAt: event?.changed_at,
    };
  }

  const body = notes.slice(REFUND_REASON_PREFIX.length);
  const [reason, description = ''] = body.split(REFUND_DESCRIPTION_SEPARATOR);

  return {
    reason: toCustomerRefundReasonLabel(reason),
    description: description.trim(),
    attemptNumber: getRefundRequestAttemptNumber(order.status_history),
    requestedAt: event?.changed_at,
  };
}

export function getRefundRequestAttemptNumber(history?: OrderStatusHistory[]): number {
  return Math.max(
    0,
    (history ?? []).filter((event) => event.to_status === 'refund_requested').length
  );
}

function getRefundRequestEvent(history?: OrderStatusHistory[]): OrderStatusHistory | undefined {
  return [...(history ?? [])]
    .reverse()
    .find((event) => event.to_status === 'refund_requested');
}

function toCustomerRefundReasonLabel(reason: string): string {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return 'Tidak ada alasan tercatat';

  const matchedReason = CUSTOMER_REFUND_REASON_OPTIONS.find((option) => (
    option.value === trimmedReason || option.label === trimmedReason
  ));

  return matchedReason?.label ?? trimmedReason;
}
