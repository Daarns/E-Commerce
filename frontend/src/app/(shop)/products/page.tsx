'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ProductGrid } from '@/components/product/product-grid';
import { productService, categoryService } from '@/services/product';
import { Product, Category } from '@/types';
import { debounce } from '@/lib/utils';

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

// Helper to capitalize category name properly (e.g., "laptops" -> "Laptops", "laptop gaming" -> "Laptop Gaming")
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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Filter state - use slug for URL/display, ID for API
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get('search') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc'>(
    (searchParams.get('sort') as 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc') || 'newest'
  );
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  // Debounced search - only updates searchQuery state AFTER 500ms
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setIsSearching(false); // Done waiting
      setCurrentPage(1); // Reset to page 1
      setProducts([]); // Clear old products
      setSearchQuery(query); // Update search query - THIS triggers the fetch in useEffect
    }, 500),
    []
  );

  // Fetch initial products when search/filters change
  useEffect(() => {
    async function fetchProducts() {
      const isFirstPage = currentPage === 1;
      if (isFirstPage) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        // Convert category slug to ID for API call
        let categoryId: string | undefined = undefined;
        if (selectedCategorySlug && selectedCategorySlug !== 'all') {
          const selectedCat = categories.find(c => c.slug === selectedCategorySlug);
          categoryId = selectedCat?.id;
        }

        const result = await productService.getProducts({
          page: currentPage,
          limit: 15,
          search: searchQuery,
          category_id: categoryId,
          sort_by: sortBy,
          min_price: minPrice ? parseFloat(minPrice) : undefined,
          max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        });

        if (currentPage === 1) {
          // First page: replace all products
          setProducts(result.products);
        } else {
          // Subsequent pages: append products (infinite scroll)
          setProducts((prev) => [...prev, ...result.products]);
        }

        setTotalProducts(result.meta.total);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }

    fetchProducts();
  }, [currentPage, searchQuery, selectedCategorySlug, sortBy, minPrice, maxPrice, categories]);

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    if (searchQuery) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }
    
    if (selectedCategorySlug && selectedCategorySlug !== 'all') {
      newParams.set('category', selectedCategorySlug);
    } else {
      newParams.delete('category');
    }
    
    if (minPrice) {
      newParams.set('min_price', minPrice);
    } else {
      newParams.delete('min_price');
    }
    
    if (maxPrice) {
      newParams.set('max_price', maxPrice);
    } else {
      newParams.delete('max_price');
    }
    
    if (sortBy !== 'newest') {
      newParams.set('sort', sortBy);
    } else {
      newParams.delete('sort');
    }
    
    newParams.set('page', '1');
    
    router.push(`/products?${newParams.toString()}`, { scroll: false });
  }, [searchQuery, selectedCategorySlug, minPrice, maxPrice, sortBy, router]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isLoading) {
          // Check if there are more pages
          const totalPages = Math.ceil(totalProducts / 15);
          if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [isLoadingMore, isLoading, currentPage, totalProducts]);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await categoryService.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInputValue(value); // Update input field display immediately
    setIsSearching(value.length > 0); // Show loading indicator while typing
    debouncedSearch(value); // Schedule fetch after 500ms of no typing
  };

  const handleCategoryChange = (value: string | null) => {
    const newValue = value || 'all';
    setSelectedCategorySlug(newValue === 'all' ? '' : newValue);
    setCurrentPage(1);
    setProducts([]);
  };

  type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc';

  const handleSortChange = (value: string | null) => {
    if (value) {
      setSortBy(value as SortOption);
      setCurrentPage(1);
      setProducts([]);
    }
  };

  const clearFilters = () => {
    setSearchInputValue('');
    setSearchQuery('');
    setSelectedCategorySlug('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setCurrentPage(1);
    setProducts([]);
    router.push('/products');
  };

  const hasActiveFilters = searchQuery || selectedCategorySlug || minPrice || maxPrice;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <Input
          placeholder="Search products..."
          value={searchInputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select value={selectedCategorySlug || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories">
              {selectedCategorySlug && selectedCategorySlug !== 'all' 
                ? capitalizeCategoryName(categories.find(c => c.slug === selectedCategorySlug)?.name || selectedCategorySlug)
                : 'All Categories'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {capitalizeCategoryName(cat.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Price Range</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setCurrentPage(1);
              setProducts([]);
            }}
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setCurrentPage(1);
              setProducts([]);
            }}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );

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
        
        <div className="flex items-center gap-4">
          {/* Mobile Filter Button */}
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
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort by'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setSearchInputValue('');
                  setSearchQuery('');
                }}
              />
            </Badge>
          )}
          {selectedCategorySlug && (
            <Badge variant="secondary" className="gap-1">
              Category: {capitalizeCategoryName(categories.find(c => c.slug === selectedCategorySlug)?.name || selectedCategorySlug)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleCategoryChange('all')}
              />
            </Badge>
          )}
          {(minPrice || maxPrice) && (
            <Badge variant="secondary" className="gap-1">
              Price: {minPrice || '0'} - {maxPrice || '∞'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
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
            <FilterContent />
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Initial loading state */}
          {isLoading && currentPage === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* No products state - only show if search is active */}
          {products.length === 0 && !isLoading && hasActiveFilters && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No products found</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}

          {/* Products Grid with infinite scroll */}
          {products.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
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
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
