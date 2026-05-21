import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

interface UseWishlistToggleActionParams {
  productId: string;
  onAuthRequired?: () => void;
}

interface UseWishlistToggleActionReturn {
  isWishlisted: boolean;
  isTogglingWishlist: boolean;
  toggleWishlistItem: () => Promise<void>;
}

export function useWishlistToggleAction({
  productId,
  onAuthRequired,
}: UseWishlistToggleActionParams): UseWishlistToggleActionReturn {
  const [isLocalToggling, setIsLocalToggling] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isWishlisted = useWishlistStore((state) =>
    state.items.some((item) => item.product_id === productId)
  );
  const isStoreToggling = useWishlistStore((state) => state.isToggling(productId));
  const { toggleWishlist } = useWishlistStore();

  const toggleWishlistItem = async (): Promise<void> => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    setIsLocalToggling(true);
    try {
      await toggleWishlist(productId);
    } finally {
      setIsLocalToggling(false);
    }
  };

  return {
    isWishlisted,
    isTogglingWishlist: isLocalToggling || isStoreToggling,
    toggleWishlistItem,
  };
}
