'use client';

import { useState } from 'react';
import { AdminOrder } from '@/services/admin';
import type { OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusUpdateDialog } from '@/components/admin/order/status-update-dialog';
import { RefundForm } from '@/components/admin/order/refund-form';

interface OrderDetailActionsProps {
  order: AdminOrder;
  onOrderUpdated?: () => void;
}

interface FulfillmentAction {
  status: OrderStatus;
  label: string;
  requiresTracking?: boolean;
}

function getFulfillmentAction(status: OrderStatus): FulfillmentAction | null {
  switch (status) {
    case 'payment_confirmed':
      return { status: 'processing', label: 'Process Order' };
    case 'processing':
      return { status: 'shipped', label: 'Mark as Shipped', requiresTracking: true };
    case 'shipped':
      return { status: 'delivered', label: 'Mark as Delivered' };
    default:
      return null;
  }
}

export function OrderDetailActions({ order, onOrderUpdated }: OrderDetailActionsProps) {
  const [fulfillmentDialogOpen, setFulfillmentDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const currentStatus = order.status || order.order_status;
  const fulfillmentAction = getFulfillmentAction(currentStatus);
  const isPaid = order.payment_status === 'paid';
  const canRefund = currentStatus === 'delivered' && isPaid;

  return (
    <>
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Fulfillment Actions</h3>
        <div className="space-y-2">
          {fulfillmentAction && (
            <Button
              onClick={() => setFulfillmentDialogOpen(true)}
              className="w-full"
              disabled={!isPaid}
            >
              {fulfillmentAction.label}
            </Button>
          )}
          {!isPaid && (
            <p className="rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
              Fulfillment tersedia setelah payment status paid.
            </p>
          )}
          {isPaid && !fulfillmentAction && !canRefund && (
            <p className="rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
              Tidak ada action fulfillment untuk status ini.
            </p>
          )}
          {canRefund && (
            <Button
              onClick={() => setRefundDialogOpen(true)}
              variant="destructive"
              className="w-full"
            >
              Process Refund
            </Button>
          )}
        </div>
      </Card>

      {fulfillmentAction && (
        <StatusUpdateDialog
          orderId={order.id}
          currentStatus={currentStatus}
          targetStatus={fulfillmentAction.status}
          actionLabel={fulfillmentAction.label}
          requiresTracking={fulfillmentAction.requiresTracking}
          open={fulfillmentDialogOpen}
          onOpenChange={setFulfillmentDialogOpen}
          onStatusUpdated={onOrderUpdated}
        />
      )}

      <RefundForm
        order={order}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        onRefundProcessed={onOrderUpdated}
      />
    </>
  );
}
