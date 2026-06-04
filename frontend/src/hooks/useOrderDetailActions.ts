import { useState } from 'react';
import { Order } from '@/types';
import { orderService } from '@/services/order';
import { useAuthStore } from '@/stores/auth-store';
import { useMidtransPaymentModal } from '@/hooks/useMidtransPaymentModal';
import { getRefundRequestAttemptNumber, isOrderPaymentRetryable, isOrderPaymentSyncable } from '@/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useOrderDetailActions(order: Order, onOrderUpdated?: (updatedOrder: Order) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openRefundDialog, setOpenRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundEvidenceImages, setRefundEvidenceImages] = useState<File[]>([]);
  const router = useRouter();
  const { user } = useAuthStore();
  const { pay, snapLoadError } = useMidtransPaymentModal();

  const status = order.order_status || order.status;
  const canCancel = status === 'pending' && !['paid', 'refunded'].includes(order.payment_status);
  const canConfirmReceived = status === 'delivered' && order.payment_status === 'paid';
  const refundAttemptCount = getRefundRequestAttemptNumber(order.status_history);
  const canRequestRefund = (
    status === 'completed' || status === 'refund_rejected'
  ) && order.payment_status === 'paid' && refundAttemptCount < 3;
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

  const handleConfirmReceived = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedOrder = await orderService.confirmReceived(order.id);
      onOrderUpdated?.(updatedOrder);
      toast.success('Pesanan dikonfirmasi diterima');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm delivery');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    window.dispatchEvent(new CustomEvent('open-chat-support', {
      detail: {
        subject: `Bantuan order ${order.order_number}`,
        message: `Halo CS, saya butuh bantuan untuk order ${order.order_number}.`,
      },
    }));
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
          void (async (): Promise<void> => {
            try {
              await orderService.syncPayment(order.id);
              const updatedOrder = await orderService.getOrder(order.order_number || order.id);
              onOrderUpdated?.(updatedOrder);
              toast.success('Pembayaran berhasil');
            } catch {
              toast.success('Pembayaran berhasil. Status akan diperbarui setelah konfirmasi gateway.');
            } finally {
              router.refresh();
            }
          })();
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

  const handleRefundEvidenceImagesChange = (files: FileList | null): void => {
    const incomingImages = Array.from(files ?? []);
    const nextImages = [...refundEvidenceImages, ...incomingImages].filter((image, index, images) => (
      images.findIndex((currentImage) => (
        currentImage.name === image.name &&
        currentImage.size === image.size &&
        currentImage.lastModified === image.lastModified
      )) === index
    )).slice(0, 3);

    if (refundEvidenceImages.length + incomingImages.length > 3) {
      toast.warning('Maksimal 3 gambar bukti refund');
    }
    setRefundEvidenceImages(nextImages);
  };

  const removeRefundEvidenceImage = (index: number): void => {
    setRefundEvidenceImages((currentImages) => currentImages.filter((_, currentIndex) => currentIndex !== index));
  };

  const clearError = (): void => {
    setError(null);
  };

  const handleRequestRefund = async () => {
    const reason = refundReason.trim();
    if (!reason) {
      setError('Alasan refund wajib diisi');
      return;
    }
    const description = refundDescription.trim();
    if (!description) {
      setError('Detail refund wajib diisi');
      return;
    }
    if (refundEvidenceImages.length === 0) {
      setError('Minimal unggah 1 gambar bukti refund');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const updatedOrder = await orderService.requestRefund(order.id, {
        reason,
        description,
        images: refundEvidenceImages,
      });
      onOrderUpdated?.(updatedOrder);
      toast.success('Pengajuan refund dikirim');
      setRefundReason('');
      setRefundDescription('');
      setRefundEvidenceImages([]);
      setOpenRefundDialog(false);
      router.refresh();
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
    refundReason,
    setRefundReason,
    refundDescription,
    setRefundDescription,
    refundEvidenceImages,
    canCancel,
    canConfirmReceived,
    canRequestRefund,
    canRetryPayment,
    canSyncPayment,
    handleCancelOrder,
    handleConfirmReceived,
    handleRetryPayment,
    handleSyncPayment,
    handleContactSupport,
    handleViewInvoice,
    handleRefundEvidenceImagesChange,
    removeRefundEvidenceImage,
    handleRequestRefund,
    clearError,
  };
}
