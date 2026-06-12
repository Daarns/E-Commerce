'use client';

import { Loader2 } from 'lucide-react';
import { Product } from '@/types';
import { VirtualizedProductGrid } from '@/components/product/VirtualizedProductGrid';

interface ProductsGridProps {
  products: Product[];
  isLoadingMore: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  columns?: 2 | 3 | 4 | 5;
}

export function ProductsGridWithScroll({
  products,
  isLoadingMore,
  observerTarget,
  columns = 5,
}: ProductsGridProps) {
  return (
    <>
      <VirtualizedProductGrid products={products} columns={columns} />

      {/* Show loading indicator while loading more */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Intersection observer target for infinite scroll */}
      <div ref={observerTarget} className="h-4" />
    </>
  );
}
