'use client';

import Image from 'next/image';
import { CalendarDays, CreditCard, Info, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_COLORS,
  SHOP_ORDER_STATUS_BADGE_COLORS,
} from '@/constants/order.constants';
import {
  formatCurrency,
  formatDate,
  getOrderItemImageUrl,
  getPaymentExpiryLabel,
  isOrderPaymentRetryable,
  isOrderPaymentSyncable,
  toNum,
} from '@/utils';
import { Order } from '@/types';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  isPayingOrder: boolean;
  isSyncingOrder: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onPay: (order: Order) => void;
  onSync: (order: Order) => void;
  onCancel: (orderId: string) => void;
}

export function OrderDetailModal({
  order,
  isOpen,
  isPayingOrder,
  isSyncingOrder,
  isCancelling,
  onClose,
  onPay,
  onSync,
  onCancel,
}: OrderDetailModalProps) {
  if (!order) return null;

  const progression = ORDER_STATUS_FLOW;
  const currentIdx = progression.indexOf(order.order_status);
  const statusLabel = order.order_status === 'pending'
    ? 'Pending Payment'
    : ORDER_STATUS_LABELS[order.order_status];
  const paymentStatusLabel = PAYMENT_STATUS_LABELS[order.payment_status];
  const shouldShowPaymentBadge = paymentStatusLabel !== statusLabel;
  const paymentExpiryLabel = getPaymentExpiryLabel(order);
  const canRetryPayment = isOrderPaymentRetryable(order);
  const canSyncPayment = isOrderPaymentSyncable(order);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 sm:px-5 sm:py-4 sm:pr-12">
          <DialogTitle className="flex flex-col gap-2 text-base sm:flex-row sm:items-center sm:justify-between sm:text-lg">
            <span className="break-all">{order.order_number}</span>
            <div className="flex flex-wrap gap-2">
              <Badge className={`${SHOP_ORDER_STATUS_BADGE_COLORS[order.order_status]} text-[11px]`}>
                {statusLabel}
              </Badge>
              {shouldShowPaymentBadge && (
                <Badge className={`${PAYMENT_STATUS_BADGE_COLORS[order.payment_status]} text-[11px]`}>
                  {paymentStatusLabel}
                </Badge>
              )}
            </div>
          </DialogTitle>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Placed on {formatDate(order.created_at)}</span>
          </div>
          {paymentExpiryLabel && (
            <p className="mt-1 text-xs text-muted-foreground">
              {paymentExpiryLabel}
            </p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              {/* Order Timeline */}
              <section className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold">Order Status</h4>
                  <span className="text-xs capitalize text-muted-foreground sm:hidden">
                    {order.order_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-start justify-between">
                    {progression.map((status, idx) => {
                      const isActive = currentIdx >= idx;
                      const isCurrent = order.order_status === status;
                      return (
                        <div key={status} className="flex flex-1 items-start">
                          <div className="flex min-w-0 flex-1 flex-col items-center">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isActive ? '✓' : idx + 1}
                            </div>
                            <span
                              className={`mt-1.5 max-w-20 text-center text-[10px] capitalize leading-tight ${
                                isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {idx < progression.length - 1 && (
                            <div
                              className={`mt-3 h-px min-w-4 flex-1 ${
                                isActive ? 'bg-primary' : 'bg-muted'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:hidden">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(((currentIdx + 1) / progression.length) * 100, 12)}%` }}
                    />
                  </div>
                </div>
              </section>

              {/* Items */}
              <section className="rounded-lg border">
                <div className="border-b px-4 py-3">
                  <h4 className="text-sm font-semibold">Items</h4>
                </div>
                <div className="divide-y">
                  {order.items.map((item) => {
                    const imageUrl = getOrderItemImageUrl(item);

                    return (
                      <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto]">
                        <div className="relative h-16 w-16 overflow-hidden rounded-md bg-muted sm:h-[72px] sm:w-[72px]">
                          {imageUrl && (
                            <Image
                              src={imageUrl}
                              alt={item.product_name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 64px, 72px"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold">{item.product_name}</p>
                          {(item.variant_type || item.variant_value) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.variant_type}: {item.variant_value}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {formatCurrency(toNum(item.unit_price))} x {item.quantity}
                          </p>
                        </div>
                        <p className="col-start-2 text-sm font-semibold sm:col-start-auto sm:text-right">
                          {formatCurrency(toNum(item.subtotal))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              {/* Shipping Address */}
              <section className="rounded-lg border p-4">
                <h4 className="mb-2 text-sm font-semibold">Shipping Address</h4>
                <div className="space-y-1 text-xs text-muted-foreground sm:text-sm">
                  <p className="font-medium text-foreground">
                    {order.shipping_name}
                  </p>
                  <p>{order.shipping_phone}</p>
                  <p>{order.shipping_address_line1}</p>
                  {order.shipping_address_line2 && (
                    <p>{order.shipping_address_line2}</p>
                  )}
                  <p>
                    {order.shipping_city}, {order.shipping_province}{' '}
                    {order.shipping_postal_code}
                  </p>
                </div>
              </section>

              {/* Payment Summary */}
              <section className="rounded-lg border p-4">
                <h4 className="mb-3 text-sm font-semibold">Payment Summary</h4>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(toNum(order.subtotal))}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatCurrency(toNum(order.shipping_cost))}</span>
                  </div>
                  {toNum(order.discount_amount) > 0 && (
                    <div className="flex justify-between gap-4 text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(toNum(order.discount_amount))}</span>
                    </div>
                  )}
                  {toNum(order.tax_amount) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(toNum(order.tax_amount))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between gap-4 text-sm font-semibold sm:text-base">
                    <span>Total</span>
                    <span>{formatCurrency(toNum(order.total))}</span>
                  </div>
                </div>
              </section>

              {/* Tracking */}
              {order.tracking_number && (
                <section className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-medium">Tracking Number:</span>
                  </div>
                  <p className="mt-2 break-all text-xs text-muted-foreground sm:text-sm">
                    {order.tracking_number}
                  </p>
                  <div className="mt-3 flex gap-2 rounded-md border bg-background p-3 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      Tracking is updated manually by the store. Use this number on the courier website for live shipment details.
                    </p>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t bg-background px-4 py-3 sm:px-5">
          <div className="grid gap-2 sm:flex sm:justify-end">
          {canRetryPayment && (
              <Button
                size="sm"
                className="gap-1 sm:min-w-44"
                onClick={() => onPay(order)}
                disabled={isPayingOrder}
              >
                <CreditCard className="h-4 w-4" />
                {isPayingOrder ? 'Memuat...' : 'Lanjutkan Pembayaran'}
              </Button>
            )}
          {canSyncPayment && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 sm:min-w-40"
              onClick={() => onSync(order)}
              disabled={isSyncingOrder}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isSyncingOrder ? 'animate-spin' : ''
                }`}
              />
              {isSyncingOrder ? 'Mengecek...' : 'Refresh Payment Status'}
            </Button>
          )}
          {order.order_status === 'pending' && (
            <Button
              size="sm"
              variant="destructive"
              disabled={isCancelling}
              onClick={() => onCancel(order.id)}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
