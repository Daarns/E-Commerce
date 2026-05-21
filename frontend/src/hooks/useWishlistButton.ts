import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useWishlistToggleAction } from '@/hooks/useWishlistToggleAction';

interface UseWishlistButtonParams {
  productId: string;
}

interface UseWishlistButtonReturn {
  inWishlist: boolean;
  isLoading: boolean;
  showAuthDialog: boolean;
  setShowAuthDialog: (show: boolean) => void;
  handleClick: (event: MouseEvent) => Promise<void>;
}

export function useWishlistButton({ productId }: UseWishlistButtonParams): UseWishlistButtonReturn {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const {
    isWishlisted,
    isTogglingWishlist,
    toggleWishlistItem,
  } = useWishlistToggleAction({
    productId,
    onAuthRequired: () => setShowAuthDialog(true),
  });

  const handleClick = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    await toggleWishlistItem();
  };

  return {
    inWishlist: isWishlisted,
    isLoading: isTogglingWishlist,
    showAuthDialog,
    setShowAuthDialog,
    handleClick,
  };
}
