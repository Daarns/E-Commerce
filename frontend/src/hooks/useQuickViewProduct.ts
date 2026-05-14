import { useState } from 'react';
import { useCartAction } from '@/hooks/useCartAction';
import { useWishlistToggleAction } from '@/hooks/useWishlistToggleAction';
import { getProductPricing } from '@/utils/product.utils';
import type { Product } from '@/types';

interface UseQuickViewProductParams {
  product: Product | null;
}

interface UseQuickViewProductReturn {
  currentImageIndex: number;
  quantity: number;
  isAddingToCart: boolean;
  isAddingToWishlist: boolean;
  authDialog: 'cart' | 'wishlist' | null;
  isWishlisted: boolean;
  discountPercentage: number;
  setCurrentImageIndex: (index: number) => void;
  setAuthDialog: (dialog: 'cart' | 'wishlist' | null) => void;
  handleNextImage: () => void;
  handlePrevImage: () => void;
  incrementQuantity: () => void;
  decrementQuantity: () => void;
  handleAddToCart: () => Promise<void>;
  handleToggleWishlist: () => Promise<void>;
}

export function useQuickViewProduct({ product }: UseQuickViewProductParams): UseQuickViewProductReturn {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [authDialog, setAuthDialog] = useState<'cart' | 'wishlist' | null>(null);

  const productId = product?.id ?? '';
  const images = product?.images || [];
  const { isAddingToCart, addProductToCart } = useCartAction();
  const {
    isWishlisted,
    isTogglingWishlist,
    toggleWishlistItem,
  } = useWishlistToggleAction({
    productId,
    onAuthRequired: () => setAuthDialog('wishlist'),
  });

  const discountPercentage = product ? getProductPricing(product).discountPercentage : 0;

  const handleNextImage = (): void => {
    if (images.length === 0) return;
    setCurrentImageIndex((previous) => (previous + 1) % images.length);
  };

  const handlePrevImage = (): void => {
    if (images.length === 0) return;
    setCurrentImageIndex((previous) => (previous - 1 + images.length) % images.length);
  };

  const incrementQuantity = (): void => {
    if (!product) return;
    setQuantity((previous) => Math.min(product.stock_quantity, previous + 1));
  };

  const decrementQuantity = (): void => {
    setQuantity((previous) => Math.max(1, previous - 1));
  };

  const handleAddToCart = async (): Promise<void> => {
    if (!product) return;

    await addProductToCart({
      productId: product.id,
      quantity,
      productName: product.name,
      onAuthRequired: () => setAuthDialog('cart'),
    });
  };

  const handleToggleWishlist = async (): Promise<void> => {
    if (!product) return;

    await toggleWishlistItem();
  };

  return {
    currentImageIndex,
    quantity,
    isAddingToCart,
    isAddingToWishlist: isTogglingWishlist,
    authDialog,
    isWishlisted,
    discountPercentage,
    setCurrentImageIndex,
    setAuthDialog,
    handleNextImage,
    handlePrevImage,
    incrementQuantity,
    decrementQuantity,
    handleAddToCart,
    handleToggleWishlist,
  };
}
