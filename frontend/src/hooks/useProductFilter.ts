import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { debounce } from '@/utils';

export interface ProductFilters {
  searchInputValue: string;
  searchQuery: string;
  isSearching: boolean;
  selectedCategorySlug: string;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc';
  minPrice: string;
  maxPrice: string;
}

export function useProductFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ProductFilters>({
    searchInputValue: searchParams.get('search') || '',
    searchQuery: searchParams.get('search') || '',
    isSearching: false,
    selectedCategorySlug: searchParams.get('category') || '',
    sortBy: (searchParams.get('sort') as ProductFilters['sortBy']) || 'newest',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
  });

  // Debounced search - only updates searchQuery after 500ms
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setFilters(prev => ({
        ...prev,
        isSearching: false,
        searchQuery: query,
      }));
    }, 500),
    []
  );

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      searchInputValue: value,
      isSearching: value.length > 0,
    }));
    debouncedSearch(value);
  };

  const handleCategoryChange = (value: string | null) => {
    const newValue = value || 'all';
    setFilters(prev => ({
      ...prev,
      selectedCategorySlug: newValue === 'all' ? '' : newValue,
    }));
  };

  const handleSortChange = (value: string | null) => {
    if (value) {
      setFilters(prev => ({
        ...prev,
        sortBy: value as ProductFilters['sortBy'],
      }));
    }
  };

  const handlePriceChange = (minPrice: string, maxPrice: string) => {
    setFilters(prev => ({
      ...prev,
      minPrice,
      maxPrice,
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchInputValue: '',
      searchQuery: '',
      isSearching: false,
      selectedCategorySlug: '',
      sortBy: 'newest',
      minPrice: '',
      maxPrice: '',
    });
    router.push('/products');
  };

  // Sync filters to URL as a side effect
  useEffect(() => {
    const newParams = new URLSearchParams();

    if (filters.searchQuery) {
      newParams.set('search', filters.searchQuery);
    }

    if (filters.selectedCategorySlug && filters.selectedCategorySlug !== 'all') {
      newParams.set('category', filters.selectedCategorySlug);
    }

    if (filters.minPrice) {
      newParams.set('min_price', filters.minPrice);
    }

    if (filters.maxPrice) {
      newParams.set('max_price', filters.maxPrice);
    }

    if (filters.sortBy !== 'newest') {
      newParams.set('sort', filters.sortBy);
    }

    newParams.set('page', '1');
    router.push(`/products?${newParams.toString()}`, { scroll: false });
  }, [filters, router]);

  const hasActiveFilters: boolean = !!(
    filters.searchQuery ||
    filters.selectedCategorySlug ||
    filters.minPrice ||
    filters.maxPrice
  );

  return {
    filters,
    hasActiveFilters,
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    handlePriceChange,
    clearFilters,
  };
}
