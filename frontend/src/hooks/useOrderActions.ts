import { useState } from 'react';
import { orderService } from '@/services/order';
import { Order } from '@/types';
import { toast } from 'sonner';
import api from '@/services/api';

export function useOrderActions() {
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isPayingOrder, setIsPayingOrder] = useState<string | null>(null);
  const [isSyncingOrder, setIsSyncingOrder] = useState<string | null>(null);

  const cancelOrder = async (orderId: string): Promise<Order | null> => {
    if (!confirm('Are you sure you want to cancel this order?')) return null;
    setIsCancelling(orderId);
    try {
      const updated = await orderService.cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      return updated;
    } catch {
      toast.error('Failed to cancel order');
      return null;
    } finally {
      setIsCancelling(null);
    }
  };

  const payOrder = async (
    order: Order,
    userEmail: string
  ): Promise<{ snapToken?: string; error?: string }> => {
    setIsPayingOrder(order.id);
    try {
      const res = await api.post<{ data: { snap_token: string } }>(
        `/orders/${order.id}/pay`,
        { customer_email: userEmail }
      );
      const snapToken = res.data.data?.snap_token;
      if (!snapToken) throw new Error('Token tidak tersedia');
      return { snapToken };
    } catch (err) {
      toast.error('Gagal memuat pembayaran. Silakan coba lagi.');
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setIsPayingOrder(null);
    }
  };

  const syncPayment = async (order: Order, currentPage: number): Promise<Order[]> => {
    setIsSyncingOrder(order.id);
    try {
      const result = await orderService.syncPayment(order.id);
      if (result.updated) {
        toast.success('Status pembayaran berhasil diperbarui!', {
          description: `Status Midtrans: ${result.transaction_status}`,
        });
        const refreshed = await orderService.getOrders(currentPage, 20);
        return refreshed.orders;
      } else {
        toast.info('Status pembayaran belum berubah.', {
          description: `Status Midtrans: ${result.transaction_status || 'pending'}`,
        });
        return [];
      }
    } catch {
      toast.error('Gagal memeriksa status pembayaran.');
      return [];
    } finally {
      setIsSyncingOrder(null);
    }
  };

  return {
    isCancelling,
    isPayingOrder,
    isSyncingOrder,
    cancelOrder,
    payOrder,
    syncPayment,
  };
}
