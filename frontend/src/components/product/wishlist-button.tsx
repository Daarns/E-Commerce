'use client';

import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlistButton } from '@/hooks/useWishlistButton';
import { AuthRequiredDialog } from '@/components/common/auth-required-dialog';

interface WishlistButtonProps {
  productId: string;
  size?: 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export function WishlistButton({
  productId,
  size = 'lg',
  variant = 'outline',
  showLabel = false,
}: WishlistButtonProps) {
  const {
    inWishlist,
    isLoading,
    showAuthDialog,
    setShowAuthDialog,
    handleClick,
  } = useWishlistButton({ productId });

  return (
    <>
      <Button
        variant={inWishlist ? 'default' : variant}
        size={size}
        onClick={(event) => void handleClick(event)}
        disabled={isLoading}
        title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        className={inWishlist ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : ''}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Heart
              className={`h-5 w-5 ${
                inWishlist ? 'fill-red-500 text-red-500' : ''
              }`}
            />
            {showLabel && (
              <span className="ml-2 text-sm">
                {inWishlist ? 'Saved' : 'Save'}
              </span>
            )}
          </>
        )}
      </Button>

      <AuthRequiredDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        feature="wishlist"
      />
    </>
  );
}
