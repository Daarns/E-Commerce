import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

interface AddProductToCartParams {
  productId: string;
  quantity: number;
  variantId?: string;
  productName?: string;
  toastDescription?: string;
  onAuthRequired?: () => void;
}

interface UseCartActionReturn {
  isAddingToCart: boolean;
  isAuthenticated: boolean;
  addProductToCart: (params: AddProductToCartParams) => Promise<boolean>;
}

export function useCartAction(): UseCartActionReturn {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const addProductToCart = async ({
    productId,
    quantity,
    variantId,
    productName,
    toastDescription,
    onAuthRequired,
  }: AddProductToCartParams): Promise<boolean> => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return false;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(productId, quantity, variantId);
      toast.success('Added to cart', {
        description: toastDescription ?? (productName ? `${quantity} x ${productName}` : undefined),
      });
      return true;
    } catch {
      toast.error('Failed to add to cart');
      return false;
    } finally {
      setIsAddingToCart(false);
    }
  };

  return {
    isAddingToCart,
    isAuthenticated,
    addProductToCart,
  };
}
