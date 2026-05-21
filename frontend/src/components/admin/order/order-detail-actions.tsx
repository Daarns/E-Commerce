'use client';

import { useState } from 'react';
import { AdminOrder } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusUpdateDialog } from '@/components/admin/order/status-update-dialog';
import { RefundForm } from '@/components/admin/order/refund-form';
import { useRouter } from 'next/navigation';

interface OrderDetailActionsProps {
  order: AdminOrder;
}

export function OrderDetailActions({ order }: OrderDetailActionsProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const router = useRouter();

  const canUpdateStatus = ['pending', 'payment_confirmed', 'processing', 'shipped', 'delivered'].includes(
    order.status || order.order_status
  );
  const canRefund = (order.status || order.order_status) === 'delivered' && order.payment_status === 'paid';

  return (
    <>
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="space-y-2">
          {canUpdateStatus && (
            <Button onClick={() => setStatusDialogOpen(true)} className="w-full">
              Update Status
            </Button>
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

      <StatusUpdateDialog
        orderId={order.id}
        currentStatus={order.status || order.order_status}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onStatusUpdated={() => router.refresh()}
      />

      <RefundForm
        order={order}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        onRefundProcessed={() => router.refresh()}
      />
    </>
  );
}
