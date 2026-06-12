import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCartAction } from '@/hooks/useCartAction';
import { useWishlistToggleAction } from '@/hooks/useWishlistToggleAction';
import { formatCurrency, getProductCardImages, getProductCardPricing, getProductImageUrl } from '@/utils';
import type { Product } from '@/types';

interface UseProductCardParams {
  product: Product;
  index: number;
}

interface UseProductCardReturn {
  isHovered: boolean;
  showQuickView: boolean;
  isAddingToCart: boolean;
  authDialog: 'cart' | 'wishlist' | null;
  isWishlisted: boolean;
  isToggling: boolean;
  priceLabel: string;
  originalPriceLabel: string | null;
  primaryImageUrl: string | undefined;
  hoverImageUrl: string | undefined;
  imagePriority: boolean;
  discountPercentage: number;
  availableStock: number;
  addToCartLabel: string;
  setIsHovered: (hovered: boolean) => void;
  setShowQuickView: (show: boolean) => void;
  setAuthDialog: (dialog: 'cart' | 'wishlist' | null) => void;
  handleAddToCart: (event: MouseEvent) => Promise<void>;
  handleToggleWishlist: (event: MouseEvent) => Promise<void>;
  openQuickView: (event: MouseEvent) => void;
}

export function useProductCard({ product, index }: UseProductCardParams): UseProductCardReturn {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [authDialog, setAuthDialog] = useState<'cart' | 'wishlist' | null>(null);

  const { isAddingToCart: cartLoading, addProductToCart } = useCartAction();
  const {
    isWishlisted,
    isTogglingWishlist,
    toggleWishlistItem,
  } = useWishlistToggleAction({
    productId: product.id,
    onAuthRequired: () => setAuthDialog('wishlist'),
  });

  const cardPricing = getProductCardPricing(product);
  const cardImages = getProductCardImages(product.images);
  const activeCombinations = (product.combinations ?? []).filter((combination) => combination.is_active);
  const hasSelectableCombinations = activeCombinations.length > 0;
  const availableStock = hasSelectableCombinations
    ? activeCombinations.reduce((total, combination) => total + combination.stock_quantity, 0)
    : product.stock_quantity;
  const priceLabel = cardPricing.hasRange
    ? `${formatCurrency(cardPricing.currentMin)} - ${formatCurrency(cardPricing.currentMax)}`
    : formatCurrency(cardPricing.currentMin);
  const originalPriceLabel = cardPricing.hasDiscount
    ? formatCurrency(cardPricing.originalPrice)
    : null;
  const primaryImageUrl = getProductImageUrl(cardImages.primary);
  const rawHoverImageUrl = getProductImageUrl(cardImages.hover);
  const hoverImageUrl = rawHoverImageUrl && rawHoverImageUrl !== primaryImageUrl
    ? rawHoverImageUrl
    : undefined;
  const discountPercentage = cardPricing.discountPercentage;
  const addToCartLabel = hasSelectableCombinations ? 'View Options' : 'Add to Cart';
  const imagePriority = index < 4;

  const handleAddToCart = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    if (hasSelectableCombinations) {
      router.push(`/products/${product.slug}`);
      return;
    }

    await addProductToCart({
      productId: product.id,
      quantity: 1,
      productName: product.name,
      toastDescription: product.name,
      onAuthRequired: () => setAuthDialog('cart'),
    });
  };

  const handleToggleWishlist = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    await toggleWishlistItem();
  };

  const openQuickView = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setShowQuickView(true);
  };

  return {
    isHovered,
    showQuickView,
    isAddingToCart: cartLoading,
    authDialog,
    isWishlisted,
    isToggling: isTogglingWishlist,
    priceLabel,
    originalPriceLabel,
    primaryImageUrl,
    hoverImageUrl,
    imagePriority,
    discountPercentage,
    availableStock,
    addToCartLabel,
    setIsHovered,
    setShowQuickView,
    setAuthDialog,
    handleAddToCart,
    handleToggleWishlist,
    openQuickView,
  };
}
