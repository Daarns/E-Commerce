'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useProductList } from '@/hooks/useProductList';
import { ProductsFilter } from '@/components/shop/ProductsFilter';
import { ProductsLoading } from '@/components/shop/ProductsLoading';
import { ProductsEmpty } from '@/components/shop/ProductsEmpty';
import { ProductsGridWithScroll } from '@/components/shop/ProductsGridWithScroll';

const capitalizeCategoryName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function ProductsPageContent() {
  const { filters, hasActiveFilters, handleSearchChange, handleCategoryChange, handleSortChange, handlePriceChange, clearFilters } = useProductFilter();
  const { products, categories, isLoading, isLoadingMore, totalProducts, currentPage, observerTarget } = useProductList(filters);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {isLoading && currentPage === 1 ? 'Loading...' : hasActiveFilters || products.length > 0 ? `${totalProducts} products found` : ''}
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ProductsFilter
                  filters={filters}
                  categories={categories}
                  hasActiveFilters={hasActiveFilters}
                  onSearchChange={handleSearchChange}
                  onCategoryChange={handleCategoryChange}
                  onSortChange={handleSortChange}
                  onPriceChange={handlePriceChange}
                  onClearFilters={clearFilters}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleSearchChange('')}
              />
            </Badge>
          )}
          {filters.selectedCategorySlug && (
            <Badge variant="secondary" className="gap-1">
              Category: {capitalizeCategoryName(categories.find(c => c.slug === filters.selectedCategorySlug)?.name || filters.selectedCategorySlug)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleCategoryChange('all')}
              />
            </Badge>
          )}
          {(filters.minPrice || filters.maxPrice) && (
            <Badge variant="secondary" className="gap-1">
              Price: {filters.minPrice || '0'} - {filters.maxPrice || '∞'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handlePriceChange('', '')}
              />
            </Badge>
          )}
        </motion.div>
      )}

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h2 className="font-semibold mb-4">Filters</h2>
            <ProductsFilter
              filters={filters}
              categories={categories}
              hasActiveFilters={hasActiveFilters}
              onSearchChange={handleSearchChange}
              onCategoryChange={handleCategoryChange}
              onSortChange={handleSortChange}
              onPriceChange={handlePriceChange}
              onClearFilters={clearFilters}
            />
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Initial loading state */}
          {isLoading && currentPage === 1 && <ProductsLoading />}

          {/* No products state */}
          {products.length === 0 && !isLoading && hasActiveFilters && (
            <ProductsEmpty onClearFilters={clearFilters} />
          )}

          {/* Products Grid with infinite scroll */}
          {products.length > 0 && (
            <ProductsGridWithScroll
              products={products}
              isLoadingMore={isLoadingMore}
              observerTarget={observerTarget}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/4] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
