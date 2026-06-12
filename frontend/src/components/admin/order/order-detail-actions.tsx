'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AdminOrder } from '@/services/admin';
import type { OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusUpdateDialog } from '@/components/admin/order/status-update-dialog';

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

  const currentStatus = order.status || order.order_status;
  const fulfillmentAction = getFulfillmentAction(currentStatus);
  const isPaid = order.payment_status === 'paid';
  const canRefund = currentStatus === 'refund_requested' && isPaid;
  const refundImages = order.refund_images ?? [];
  const shouldShowActionsCard = !isPaid || Boolean(fulfillmentAction) || canRefund;

  return (
    <>
      {shouldShowActionsCard && (
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
            {canRefund && (
              <div className="space-y-3">
                {refundImages.length > 0 && (
                  <div className="rounded-md border bg-gray-50 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-700">Bukti refund</p>
                    <div className="grid grid-cols-3 gap-2">
                      {refundImages.map((image) => (
                        <a
                          key={image.id}
                          href={image.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded border bg-white"
                        >
                          <Image
                            src={image.image_url}
                            alt="Bukti refund"
                            width={120}
                            height={80}
                            unoptimized
                            className="h-20 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <Link href={`/admin/orders/refunds/${order.id}`}>
                  <Button variant="destructive" className="w-full">
                    Review Refund Request
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

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
    </>
  );
}
