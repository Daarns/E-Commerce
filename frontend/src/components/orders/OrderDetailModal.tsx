'use client';

import Image from 'next/image';
import { CreditCard, RefreshCw, Truck } from 'lucide-react';
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
  SHOP_ORDER_STATUS_BADGE_COLORS,
} from '@/constants/order.constants';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import { toNum, formatCurrency } from '@/utils';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {order.order_number}
            <Badge className={SHOP_ORDER_STATUS_BADGE_COLORS[order.order_status]}>
              {statusLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Order Timeline */}
          <div>
            <h4 className="font-medium mb-3">Order Status</h4>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {progression.map((status, idx) => {
                const isActive = currentIdx >= idx;
                const isCurrent = order.order_status === status;
                return (
                  <div key={status} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isActive ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-xs mt-1 text-center ${
                          isCurrent ? 'font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {idx < progression.length - 1 && (
                      <div
                        className={`w-12 h-0.5 mx-1 ${
                          isActive ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="font-medium mb-3">Items</h4>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={PLACEHOLDER_PRODUCT_IMAGE}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    {(item.variant_type || item.variant_value) && (
                      <p className="text-sm text-muted-foreground">
                        {item.variant_type}: {item.variant_value}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(toNum(item.unit_price))} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(toNum(item.subtotal))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div>
            <h4 className="font-medium mb-3">Shipping Address</h4>
            <div className="text-sm text-muted-foreground space-y-0.5">
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
          </div>

          <Separator />

          {/* Payment Summary */}
          <div>
            <h4 className="font-medium mb-3">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(toNum(order.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(toNum(order.shipping_cost))}</span>
              </div>
              {toNum(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>
                    -{formatCurrency(toNum(order.discount_amount))}
                  </span>
                </div>
              )}
              {toNum(order.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(toNum(order.tax_amount))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium text-base">
                <span>Total</span>
                <span>{formatCurrency(toNum(order.total))}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking_number && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-primary" />
                <span className="font-medium">Tracking Number:</span>
                <span className="text-muted-foreground">
                  {order.tracking_number}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 flex-wrap">
            {order.order_status === 'pending' &&
              order.payment_status === 'unpaid' && (
              <Button
                className="flex-1 gap-1"
                onClick={() => onPay(order)}
                disabled={isPayingOrder}
              >
                <CreditCard className="h-4 w-4" />
                {isPayingOrder ? 'Memuat...' : 'Lanjutkan Pembayaran'}
              </Button>
            )}
            {order.order_status === 'pending' && (
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => onSync(order)}
                disabled={isSyncingOrder}
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isSyncingOrder ? 'animate-spin' : ''
                  }`}
                />
                {isSyncingOrder ? 'Mengecek...' : 'Cek Status Pembayaran'}
              </Button>
            )}
            {order.order_status === 'pending' && (
              <Button
                variant="destructive"
                className="flex-1"
                disabled={isCancelling}
                onClick={() => onCancel(order.id)}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
