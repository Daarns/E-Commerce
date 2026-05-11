import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart-store';
import { orderService } from '@/services/order';
import { useMidtransPayment } from './useMidtransPayment';

export function useCheckoutOrder() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { openPaymentPopup } = useMidtransPayment();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const generateIdempotencyKey = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
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
        idempotency_key: generateIdempotencyKey(),
      });

      const { order, snap_token, redirect_url } = result;

      if (snap_token) {
        const paymentOpened = openPaymentPopup(snap_token, {
          onSuccess: () => {
            clearCart();
            router.push(`/orders/${order.id}?payment=success`);
          },
          onPending: () => {
            clearCart();
            router.push(`/orders/${order.id}?payment=pending`);
          },
          onError: () => {
            setIsProcessing(false);
            throw new Error(
              `Pembayaran untuk order ${order.order_number} gagal. Silakan coba lagi.`
            );
          },
          onClose: () => {
            setIsProcessing(false);
            router.push(`/orders/${order.id}?payment=cancelled`);
          },
        });

        if (!paymentOpened && redirect_url) {
          window.location.href = redirect_url;
        }
      } else {
        clearCart();
        router.push(`/orders/${order.id}?success=true`);
      }
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  };

  return { isProcessing, placeOrder };
}
