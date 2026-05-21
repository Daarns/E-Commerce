import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { orderService } from '@/services/order';
import { Order } from '@/types';
import { toast } from 'sonner';

interface PaymentFlowState {
  isLoading: boolean;
  order: Order | null;
  error: string | null;
  paymentStatus: 'pending' | 'processing' | 'settlement' | 'failed' | null;
}

export function usePaymentFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const orderId = searchParams.get('order_id');
  const [state, setState] = useState<PaymentFlowState>({
    isLoading: true,
    order: null,
    error: null,
    paymentStatus: null,
  });

  // Fetch order data on mount
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!orderId) {
      router.push('/cart');
      return;
    }

    const fetchOrder = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const order = await orderService.getOrder(orderId);

        if (!order) {
          setState(prev => ({
            ...prev,
            error: 'Order not found',
            isLoading: false,
          }));
          return;
        }

        if (!order.payment_url) {
          setState(prev => ({
            ...prev,
            error: 'No payment token available',
            isLoading: false,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          order,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to load payment information',
          isLoading: false,
        }));
        toast.error('Failed to load payment information');
      }
    };

    fetchOrder();
  }, [orderId, user, router]);

  const handlePaymentSuccess = () => {
    setState(prev => ({
      ...prev,
      paymentStatus: 'settlement',
      isLoading: false,
    }));
    toast.success('Payment successful!');

    setTimeout(() => {
      router.push(`/orders/${orderId}`);
    }, 2000);
  };

  const handlePaymentError = (errorMessage?: string) => {
    setState(prev => ({
      ...prev,
      paymentStatus: 'failed',
      isLoading: false,
    }));
    toast.error(errorMessage || 'Payment failed');
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  return {
    orderId,
    state,
    setLoading,
    handlePaymentSuccess,
    handlePaymentError,
  };
}
