'use client';

import { useState, useEffect } from 'react';
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
  const { isInWishlist, addToWishlist, removeFromWishlist, items } = useWishlistStore();
  const [isLoading, setIsLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);

  useEffect(() => {
    const item = items.find((i) => i.product_id === productId);
    setInWishlist(!!item);
    setWishlistId(item?.id || null);
  }, [items, productId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please log in to manage wishlist');
      return;
    }

    setIsLoading(true);
    try {
      if (inWishlist && wishlistId) {
        await removeFromWishlist(wishlistId);
      } else {
        await addToWishlist(productId);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
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
  );
}
