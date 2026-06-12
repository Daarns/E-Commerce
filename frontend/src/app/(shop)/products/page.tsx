'use client';

import { Suspense, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, SlidersHorizontal, X } from 'lucide-react';
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
  const [showDesktopFilters, setShowDesktopFilters] = useState(true);
  const {
    filters,
    appliedFilters,
    hasActiveFilters,
    isFilterPending,
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    handlePriceChange,
    clearFilters,
  } = useProductFilter();
  const { products, categories, isLoading, isLoadingMore, totalProducts, currentPage, observerTarget } = useProductList(appliedFilters);
  const shouldShowProductSkeleton = isFilterPending || (isLoading && currentPage === 1);
  const shouldShowSearchResultCount = !!appliedFilters.searchQuery && !shouldShowProductSkeleton;
  const productGridColumns = showDesktopFilters ? 3 : 5;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          {(shouldShowProductSkeleton || shouldShowSearchResultCount) && (
            <p className="text-muted-foreground">
              {shouldShowProductSkeleton ? 'Loading...' : `${totalProducts} products found`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hidden gap-2 md:inline-flex"
            onClick={() => setShowDesktopFilters((current) => !current)}
          >
            {showDesktopFilters ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
            {showDesktopFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>

          {/* Mobile Filter Button */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" aria-label="Open filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm px-0">
              <SheetHeader className="border-b px-6 pb-4 text-left">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="px-6 py-6">
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
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.searchInputValue && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchInputValue}
              <button
                type="button"
                aria-label="Remove search filter"
                className="rounded-full p-0.5 hover:bg-muted-foreground/15"
                onClick={() => handleSearchChange('')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.selectedCategorySlug && (
            <Badge variant="secondary" className="gap-1">
              Category: {capitalizeCategoryName(categories.find(c => c.slug === filters.selectedCategorySlug)?.name || filters.selectedCategorySlug)}
              <button
                type="button"
                aria-label="Remove category filter"
                className="rounded-full p-0.5 hover:bg-muted-foreground/15"
                onClick={() => handleCategoryChange('all')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filters.minPrice || filters.maxPrice) && (
            <Badge variant="secondary" className="gap-1">
              Price: {filters.minPrice || '0'} - {filters.maxPrice || '∞'}
              <button
                type="button"
                aria-label="Remove price filter"
                className="rounded-full p-0.5 hover:bg-muted-foreground/15"
                onClick={() => handlePriceChange('', '')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-5 lg:gap-6">
        {/* Desktop Sidebar */}
        {showDesktopFilters && (
        <aside className="hidden md:block w-56 flex-shrink-0 lg:w-60">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Hide filters"
                onClick={() => setShowDesktopFilters(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
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
        )}

        {/* Products Grid */}
        <div className="flex-1">
          {/* Initial loading state */}
          {shouldShowProductSkeleton && <ProductsLoading />}

          {/* No products state */}
          {products.length === 0 && !shouldShowProductSkeleton && hasActiveFilters && (
            <ProductsEmpty onClearFilters={clearFilters} />
          )}

          {/* Products Grid with infinite scroll */}
          {products.length > 0 && !shouldShowProductSkeleton && (
            <ProductsGridWithScroll
              products={products}
              isLoadingMore={isLoadingMore}
              observerTarget={observerTarget}
              columns={productGridColumns}
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
