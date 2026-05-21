import { useState } from 'react';
import { Order } from '@/types';
import { orderService } from '@/services/order';
import { useAuthStore } from '@/stores/auth-store';
import { useMidtransPaymentModal } from '@/hooks/useMidtransPaymentModal';
import { isOrderPaymentRetryable, isOrderPaymentSyncable } from '@/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useOrderDetailActions(order: Order, onOrderUpdated?: (updatedOrder: Order) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openRefundDialog, setOpenRefundDialog] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();
  const { pay, snapLoadError } = useMidtransPaymentModal();

  const status = order.order_status || order.status;
  const canCancel = status && ['pending', 'payment_confirmed', 'processing'].includes(status);
  const canRequestRefund = status === 'delivered' && order.payment_status === 'paid';
  const canRetryPayment = isOrderPaymentRetryable(order);
  const canSyncPayment = isOrderPaymentSyncable(order);

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

  const handleRetryPayment = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await orderService.payOrder(order.id, user?.email);
      if (!result.snap_token) {
        throw new Error('Payment token is missing');
      }

      const opened = pay(result.snap_token, {
        onSuccess: () => {
          toast.success('Pembayaran berhasil');
          router.refresh();
        },
        onPending: () => {
          toast.info('Menunggu konfirmasi pembayaran');
          router.refresh();
        },
        onError: () => {
          toast.error('Pembayaran gagal. Silakan coba lagi.');
        },
        onClose: () => {
          toast.info('Popup pembayaran ditutup. Anda masih bisa melanjutkan pembayaran dari halaman order.');
        },
      });

      if (!opened && result.redirect_url) {
        window.location.href = result.redirect_url;
      } else if (!opened) {
        throw new Error(snapLoadError ?? 'Midtrans Snap is not ready');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPayment = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await orderService.syncPayment(order.id);
      toast.info(result.updated ? 'Status pembayaran diperbarui' : 'Status pembayaran belum berubah', {
        description: `Midtrans: ${result.transaction_status || 'pending'}`,
      });
      const updatedOrder = await orderService.getOrder(order.id);
      onOrderUpdated?.(updatedOrder);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync payment status');
    } finally {
      setIsLoading(false);
    }
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
    canRetryPayment,
    canSyncPayment,
    handleCancelOrder,
    handleRetryPayment,
    handleSyncPayment,
    handleContactSupport,
    handleViewInvoice,
    handleRequestRefund,
  };
}
