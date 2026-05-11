'use client';

import { Loader2 } from 'lucide-react';
import { Product } from '@/types';
import { ProductGrid } from '@/components/product/product-grid';

interface ProductsGridProps {
  products: Product[];
  isLoadingMore: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
}

export function ProductsGridWithScroll({
  products,
  isLoadingMore,
  observerTarget,
}: ProductsGridProps) {
  return (
    <>
      <ProductGrid products={products} columns={5} />

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
