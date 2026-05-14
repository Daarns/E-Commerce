import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, RefObject } from 'react';
import { animate } from 'animejs';
import { useCartAction } from '@/hooks/useCartAction';
import { useWishlistToggleAction } from '@/hooks/useWishlistToggleAction';
import { getProductPricing } from '@/utils/product.utils';
import type { Product } from '@/types';

interface UseProductCardParams {
  product: Product;
  index: number;
}

interface UseProductCardReturn {
  cardRef: RefObject<HTMLDivElement | null>;
  isHovered: boolean;
  imageLoaded: boolean;
  showQuickView: boolean;
  isAddingToCart: boolean;
  authDialog: 'cart' | 'wishlist' | null;
  isWishlisted: boolean;
  isToggling: boolean;
  regularPrice: number;
  salePrice: number | undefined;
  discountPercentage: number;
  setIsHovered: (hovered: boolean) => void;
  setImageLoaded: (loaded: boolean) => void;
  setShowQuickView: (show: boolean) => void;
  setAuthDialog: (dialog: 'cart' | 'wishlist' | null) => void;
  handleAddToCart: (event: MouseEvent) => Promise<void>;
  handleToggleWishlist: (event: MouseEvent) => Promise<void>;
  openQuickView: (event: MouseEvent) => void;
}

export function useProductCard({ product, index }: UseProductCardParams): UseProductCardReturn {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [authDialog, setAuthDialog] = useState<'cart' | 'wishlist' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { isAddingToCart: cartLoading, addProductToCart } = useCartAction();
  const {
    isWishlisted,
    isTogglingWishlist,
    toggleWishlistItem,
  } = useWishlistToggleAction({
    productId: product.id,
    onAuthRequired: () => setAuthDialog('wishlist'),
  });

  const { regularPrice, salePrice, discountPercentage } = getProductPricing(product);

  useEffect(() => {
    if (discountPercentage > 0 && cardRef.current) {
      const badge = cardRef.current.querySelector('.discount-badge');
      if (badge) {
        animate(badge, {
          scale: [0, 1],
          rotate: [45, 0],
          duration: 600,
          delay: index * 100,
          ease: 'outElastic(1, .6)',
        });
      }
    }
  }, [discountPercentage, index]);

  const handleAddToCart = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

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
    cardRef,
    isHovered,
    imageLoaded,
    showQuickView,
    isAddingToCart: cartLoading,
    authDialog,
    isWishlisted,
    isToggling: isTogglingWishlist,
    regularPrice,
    salePrice,
    discountPercentage,
    setIsHovered,
    setImageLoaded,
    setShowQuickView,
    setAuthDialog,
    handleAddToCart,
    handleToggleWishlist,
    openQuickView,
  };
}
