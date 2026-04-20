'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

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
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  
  // Subscribe to wishlist changes
  const inWishlist = useWishlistStore((state) => 
    state.items.some((item) => item.product_id === productId)
  );
  const { addToWishlist, removeFromWishlist } = useWishlistStore();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please log in to manage wishlist');
      return;
    }

    setIsLoading(true);
    try {
      if (inWishlist) {
        const wishlistItem = useWishlistStore.getState().items.find(
          (item) => item.product_id === productId
        );
        if (wishlistItem) {
          await removeFromWishlist(wishlistItem.id);
        }
      } else {
        await addToWishlist(productId);
      }
    } catch (error) {
      // Error is already handled with toast in store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={inWishlist ? 'default' : variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      className={inWishlist ? 'bg-red-500 hover:bg-red-600' : ''}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <Heart
            className={`h-5 w-5 ${
              inWishlist ? 'fill-white text-white' : ''
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
  );
}
