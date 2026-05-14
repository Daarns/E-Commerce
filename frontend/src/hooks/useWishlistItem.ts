import { useState } from 'react';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';
import { useCartAction } from '@/hooks/useCartAction';
import { useWishlistStore } from '@/stores/wishlist-store';
import { getProductPricing } from '@/utils/product.utils';
import type { Product } from '@/types';

interface UseWishlistItemParams {
  wishlistId: string;
  product: Product;
}

interface UseWishlistItemReturn {
  isImageLoaded: boolean;
  isAddingToCart: boolean;
  isRemoving: boolean;
  discountPercentage: number;
  setIsImageLoaded: (loaded: boolean) => void;
  handleAddToCart: (event: MouseEvent) => Promise<void>;
  handleRemoveFromWishlist: (event: MouseEvent) => Promise<void>;
}

export function useWishlistItem({ wishlistId, product }: UseWishlistItemParams): UseWishlistItemReturn {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { isAddingToCart, addProductToCart } = useCartAction();
  const { removeFromWishlist } = useWishlistStore();

  const discountPercentage = getProductPricing(product).discountPercentage;

  const handleAddToCart = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    await addProductToCart({
      productId: product.id,
      quantity: 1,
      productName: product.name,
      toastDescription: product.name,
    });
  };

  const handleRemoveFromWishlist = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    setIsRemoving(true);
    try {
      await removeFromWishlist(wishlistId);
      toast.success('Removed from wishlist');
    } catch {
      // Error already handled with toast in store.
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    isImageLoaded,
    isAddingToCart,
    isRemoving,
    discountPercentage,
    setIsImageLoaded,
    handleAddToCart,
    handleRemoveFromWishlist,
  };
}
