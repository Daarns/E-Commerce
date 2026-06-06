import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Product } from '@/types';

const WISHLIST_BATCH_SIZE = 12;

interface UseWishlistInfiniteGridReturn {
  visibleProducts: Product[];
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  handleLoadMore: () => void;
}

export function useWishlistInfiniteGrid(products: Product[]): UseWishlistInfiniteGridReturn {
  const [visibleCount, setVisibleCount] = useState(WISHLIST_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback((): void => {
    setVisibleCount((current) => Math.min(products.length, current + WISHLIST_BATCH_SIZE));
  }, [products.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= products.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '320px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, products.length, visibleCount]);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );

  return {
    visibleProducts,
    hasMore: visibleCount < products.length,
    sentinelRef,
    handleLoadMore,
  };
}
