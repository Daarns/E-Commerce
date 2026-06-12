import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart-store';
import { orderService } from '@/services/order';
import { useMidtransPayment } from './useMidtransPayment';

const CHECKOUT_IDEMPOTENCY_KEY = 'checkout:idempotency-key';

function buildPaymentErrorUrl(orderId: string, status: string): string {
  const params = new URLSearchParams({
    order_id: orderId,
    transaction_status: status,
  });
  return `/payment/error?${params.toString()}`;
}

export function useCheckoutOrder() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { openPaymentPopup } = useMidtransPayment();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const generateIdempotencyKey = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  const getIdempotencyKey = (): string => {
    if (typeof window === 'undefined') {
      return generateIdempotencyKey();
    }

    const existing = window.sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY);
    if (existing) return existing;

    const next = generateIdempotencyKey();
    window.sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, next);
    return next;
  };

  const clearIdempotencyKey = (): void => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY);
    }
  };

  const placeOrder = async (params: {
    addressId: string;
    shippingMethod: string;
    promoCode?: string;
    customerEmail: string;
  }): Promise<void> => {
    setIsProcessing(true);

    try {
      const result = await orderService.checkout({
        address_id: params.addressId,
        shipping_method: params.shippingMethod,
        payment_method: 'midtrans_snap',
        promo_code: params.promoCode || undefined,
        customer_email: params.customerEmail,
        idempotency_key: getIdempotencyKey(),
      });

      const { order, snap_token, redirect_url } = result;

      if (snap_token) {
        const paymentOpened = openPaymentPopup(snap_token, {
          onSuccess: () => {
            void (async (): Promise<void> => {
              try {
                const syncResult = await orderService.syncPayment(order.id);
                if (syncResult.payment_status === 'paid') {
                  clearIdempotencyKey();
                  clearCart();
                  router.push(`/orders/${order.order_number}?payment=success`);
                  return;
                }
                setIsProcessing(false);
                router.push(`/orders/${order.order_number}?payment=pending`);
              } catch (error) {
                console.warn('Payment status sync failed after Snap success:', error);
                setIsProcessing(false);
                router.push(`/orders/${order.order_number}?payment=pending`);
              }
            })();
          },
          onPending: () => {
            clearIdempotencyKey();
            clearCart();
            router.push(`/orders/${order.order_number}?payment=pending`);
          },
          onError: () => {
            clearIdempotencyKey();
            clearCart();
            setIsProcessing(false);
            router.push(buildPaymentErrorUrl(order.order_number, 'failed'));
          },
          onClose: () => {
            clearIdempotencyKey();
            clearCart();
            setIsProcessing(false);
            router.push(`/orders/${order.order_number}?payment=cancelled`);
          },
        });

        if (!paymentOpened && redirect_url) {
          clearIdempotencyKey();
          clearCart();
          window.location.href = redirect_url;
        } else if (!paymentOpened) {
          clearIdempotencyKey();
          clearCart();
          setIsProcessing(false);
          router.push(buildPaymentErrorUrl(order.order_number, 'unavailable'));
        }
      } else if (redirect_url) {
        clearIdempotencyKey();
        clearCart();
        window.location.href = redirect_url;
      } else {
        clearIdempotencyKey();
        clearCart();
        router.push(buildPaymentErrorUrl(order.order_number, 'unavailable'));
      }
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  };

  return { isProcessing, placeOrder };
}
