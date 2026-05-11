import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

export function useCheckoutAuth() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { cart } = useCartStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [isAuthenticated, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      router.push('/cart');
    }
  }, [cart, router]);

  return {
    isAuthenticated,
    hasValidCart: !!(cart && cart.items.length > 0),
  };
}
