import { useState, useEffect, useCallback } from 'react';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useAuthStore } from '@/stores/auth-store';
import { Product } from '@/types';

export function useWishlistData() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { items, isLoading } = useWishlistStore();
  const loadWishlistFn = useWishlistStore((state) => state.loadWishlist);
  const [pageLoading, setPageLoading] = useState(true);

  const handleLoadWishlist = useCallback(async () => {
    if (user && isAuthenticated) {
      await loadWishlistFn();
    }
  }, [user, isAuthenticated, loadWishlistFn]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      await handleLoadWishlist();
      if (isMounted) {
        setPageLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [handleLoadWishlist]);

  // Extract products from wishlist items
  const products = items
    .map((item) => item.product)
    .filter((product): product is Product => product !== null && product !== undefined);

  return {
    user,
    isAuthenticated,
    items,
    products,
    isLoading,
    pageLoading,
  };
}
