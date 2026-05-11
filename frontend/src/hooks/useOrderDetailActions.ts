import { useState } from 'react';
import { Order } from '@/types';
import { orderService } from '@/services/order';
import { useRouter } from 'next/navigation';

export function useOrderDetailActions(order: Order, onOrderUpdated?: (updatedOrder: Order) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openRefundDialog, setOpenRefundDialog] = useState(false);
  const router = useRouter();

  const status = order.order_status || order.status;
  const canCancel = status && ['pending', 'payment_confirmed', 'processing'].includes(status);
  const canRequestRefund = status === 'delivered' && order.payment_status === 'paid';

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
    window.location.href = `mailto:support@ecommerce.com?subject=Order%20${order.order_number}`;
  };

  const handleViewInvoice = () => {
    console.log('View invoice for order:', order.id);
  };

  const handleRequestRefund = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Request refund for order:', order.id);
      setOpenRefundDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request refund');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    openCancelDialog,
    setOpenCancelDialog,
    openRefundDialog,
    setOpenRefundDialog,
    canCancel,
    canRequestRefund,
    handleCancelOrder,
    handleContactSupport,
    handleViewInvoice,
    handleRequestRefund,
  };
}
