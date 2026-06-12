import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

export function useCheckoutAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { cart } = useCartStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    if (!cart || cart.items.length === 0) {
      router.push('/cart');
    }
  }, [cart, isAuthenticated, isAuthLoading, router]);

  return {
    isAuthenticated,
    isAuthLoading,
    hasValidCart: !!(cart && cart.items.length > 0),
  };
}
