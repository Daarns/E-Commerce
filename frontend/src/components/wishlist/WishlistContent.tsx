'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product/product-card';
import { useWishlistInfiniteGrid } from '@/hooks/useWishlistInfiniteGrid';
import { Product } from '@/types';

interface WishlistContentProps {
  products: Product[];
  isLoading?: boolean;
}

export function WishlistContent({ products, isLoading = false }: WishlistContentProps) {
  const {
    visibleProducts,
    hasMore,
    sentinelRef,
    handleLoadMore,
  } = useWishlistInfiniteGrid(products);

  if (isLoading) {
    return <WishlistGridSkeleton />;
  }

  return (
    <>
      <motion.div
        layout
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      >
        {visibleProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </motion.div>

      <div ref={sentinelRef} className="h-2" />

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" className="gap-2" onClick={handleLoadMore}>
            Muat wishlist lainnya
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-4 pt-8"
      >
        <Button asChild variant="outline">
          <Link href="/products">Continue Shopping</Link>
        </Button>
        <Button asChild>
          <Link href="/cart">View Cart</Link>
        </Button>
      </motion.div>
    </>
  );
}

export function WishlistGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
