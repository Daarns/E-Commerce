import { useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export function useProductActions() {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const { addToCart } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleAddToCart = async (productId: string, variantId?: string, productName?: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(productId, quantity, variantId);
      toast.success('Added to cart', {
        description: `${quantity}x ${productName || 'Product'}`,
      });
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const incrementQuantity = (maxStock: number) => {
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  return {
    quantity,
    setQuantity,
    isAddingToCart,
    showAuthDialog,
    setShowAuthDialog,
    isAuthenticated,
    handleAddToCart,
    incrementQuantity,
    decrementQuantity,
  };
}
