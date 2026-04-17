'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/types';
import { orderService } from '@/services/order';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Phone, FileText, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrderActionsProps {
  order: Order;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export function OrderActions({ order, onOrderUpdated }: OrderActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openRefundDialog, setOpenRefundDialog] = useState(false);
  const router = useRouter();

  const canCancel = ['pending', 'confirmed', 'processing'].includes(order.status);
  const canRequestRefund = order.status === 'delivered' && order.payment_status === 'paid';

  const handleCancelOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedOrder = await orderService.cancelOrder(order.id);
      onOrderUpdated?.(updatedOrder);
      setOpenCancelDialog(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    // Open a mailto link or navigate to support page
    window.location.href = `mailto:support@ecommerce.com?subject=Order%20${order.order_number}`;
  };

  const handleViewInvoice = () => {
    // TODO: Implement invoice download/view
    console.log('View invoice for order:', order.id);
  };

  const handleRequestRefund = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Implement refund request flow
      console.log('Request refund for order:', order.id);
      setOpenRefundDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request refund');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Order Actions</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Contact Support */}
        <Button
          variant="outline"
          onClick={handleContactSupport}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Contact Support
        </Button>

        {/* View Invoice */}
        <Button
          variant="outline"
          onClick={handleViewInvoice}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          View Invoice
        </Button>

        {/* Request Refund */}
        {canRequestRefund && (
          <Dialog open={openRefundDialog} onOpenChange={setOpenRefundDialog}>
            <DialogTrigger>
              <Button
                variant="outline"
                disabled={isLoading}
                className="flex items-center gap-2 w-full"
              >
                <RotateCcw className="w-4 h-4" />
                Request Refund
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Refund</DialogTitle>
                <DialogDescription>
                  Are you sure you want to request a refund for this order? Please contact our support team for more information about the refund process.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  <strong>Refund Amount:</strong> Rp {order.total_amount.toLocaleString('id-ID')}
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setOpenRefundDialog(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRequestRefund}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Request Refund'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Cancel Order */}
        {canCancel && (
          <Dialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
            <DialogTrigger>
              <Button
                variant="destructive"
                disabled={isLoading}
                className="flex items-center gap-2 w-full"
              >
                <Trash2 className="w-4 h-4" />
                Cancel Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this order? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpenCancelDialog(false)}
                  disabled={isLoading}
                >
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={isLoading}
                >
                  {isLoading ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canCancel && order.status !== 'cancelled' && (
        <p className="text-sm text-gray-500 mt-4">
          This order cannot be cancelled as it is already {order.status}.
        </p>
      )}
    </div>
  );
}
