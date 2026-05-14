import { useState } from 'react';
import { useCartAction } from '@/hooks/useCartAction';

interface UseProductActionsReturn {
  quantity: number;
  setQuantity: (quantity: number) => void;
  isAddingToCart: boolean;
  showAuthDialog: boolean;
  setShowAuthDialog: (show: boolean) => void;
  isAuthenticated: boolean;
  handleAddToCart: (productId: string, variantId?: string, productName?: string) => Promise<void>;
  incrementQuantity: (maxStock: number) => void;
  decrementQuantity: () => void;
}

export function useProductActions(): UseProductActionsReturn {
  const [quantity, setQuantity] = useState(1);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { isAddingToCart, isAuthenticated, addProductToCart } = useCartAction();

  const handleAddToCart = async (
    productId: string,
    variantId?: string,
    productName?: string
  ): Promise<void> => {
    await addProductToCart({
      productId,
      quantity,
      variantId,
      productName,
      toastDescription: `${quantity}x ${productName || 'Product'}`,
      onAuthRequired: () => setShowAuthDialog(true),
    });
  };

  const incrementQuantity = (maxStock: number): void => {
    setQuantity((previous) => Math.min(maxStock, previous + 1));
  };

  const decrementQuantity = (): void => {
    setQuantity((previous) => Math.max(1, previous - 1));
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
