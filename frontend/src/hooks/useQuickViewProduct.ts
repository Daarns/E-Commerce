import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartAction } from '@/hooks/useCartAction';
import { useWishlistToggleAction } from '@/hooks/useWishlistToggleAction';
import { formatCurrency, getProductCardPricing } from '@/utils';
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
  priceLabel: string;
  originalPriceLabel: string | null;
  availableStock: number;
  actionLabel: string;
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
  const router = useRouter();
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

  const pricing = product ? getProductCardPricing(product) : null;
  const activeCombinations = product?.combinations?.filter((combination) => combination.is_active) ?? [];
  const requiresOptions = activeCombinations.length > 0;
  const availableStock = requiresOptions
    ? activeCombinations.reduce((total, combination) => total + combination.stock_quantity, 0)
    : product?.stock_quantity ?? 0;
  const discountPercentage = pricing?.discountPercentage ?? 0;
  const priceLabel = pricing
    ? formatCurrency(pricing.currentMin)
    : formatCurrency(0);
  const originalPriceLabel = pricing?.hasDiscount
    ? formatCurrency(pricing.originalPrice)
    : null;
  const actionLabel = requiresOptions ? 'View Options' : 'Add to Cart';

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
    setQuantity((previous) => Math.min(availableStock, previous + 1));
  };

  const decrementQuantity = (): void => {
    setQuantity((previous) => Math.max(1, previous - 1));
  };

  const handleAddToCart = async (): Promise<void> => {
    if (!product) return;
    if (requiresOptions) {
      router.push(`/products/${product.slug}`);
      return;
    }

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
    priceLabel,
    originalPriceLabel,
    availableStock,
    actionLabel,
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
