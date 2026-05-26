import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface ProductFilters {
  searchInputValue: string;
  searchQuery: string;
  isSearching: boolean;
  selectedCategorySlug: string;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc';
  minPrice: string;
  maxPrice: string;
}

const SHOP_SEARCH_DEBOUNCE_MS = 2500;
const SHOP_FILTER_DEBOUNCE_MS = 2000;
const PRODUCT_SORT_VALUES: Record<ProductFilters['sortBy'], true> = {
  newest: true,
  price_asc: true,
  price_desc: true,
  popular: true,
  name_asc: true,
  name_desc: true,
};

const isProductSortValue = (value: string | null): value is ProductFilters['sortBy'] => {
  return !!value && Object.prototype.hasOwnProperty.call(PRODUCT_SORT_VALUES, value);
};

const getInitialFilters = (searchParams: ReturnType<typeof useSearchParams>): ProductFilters => {
  const sortParam = searchParams.get('sort');

  return {
    searchInputValue: searchParams.get('search') || '',
    searchQuery: searchParams.get('search') || '',
    isSearching: false,
    selectedCategorySlug: searchParams.get('category') || '',
    sortBy: isProductSortValue(sortParam) ? sortParam : 'newest',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
  };
};

const DEFAULT_FILTERS: ProductFilters = {
  searchInputValue: '',
  searchQuery: '',
  isSearching: false,
  selectedCategorySlug: '',
  sortBy: 'newest',
  minPrice: '',
  maxPrice: '',
};

export function useProductFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilters = getInitialFilters(searchParams);

  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(initialFilters);
  const [isSearchPending, setIsSearchPending] = useState(false);
  const [isFilterPending, setIsFilterPending] = useState(false);
  const filtersRef = useRef<ProductFilters>(initialFilters);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearchTimer = useCallback((): void => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }, []);

  const clearFilterTimer = useCallback((): void => {
    if (filterTimerRef.current) {
      clearTimeout(filterTimerRef.current);
      filterTimerRef.current = null;
    }
  }, []);

  const updateDraftFilters = useCallback((nextFilters: ProductFilters): void => {
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
  }, []);

  const scheduleFilterApply = useCallback((nextFilters: ProductFilters): void => {
    clearFilterTimer();
    setIsFilterPending(true);

    filterTimerRef.current = setTimeout(() => {
      setAppliedFilters(prev => ({
        ...prev,
        selectedCategorySlug: nextFilters.selectedCategorySlug,
        sortBy: nextFilters.sortBy,
        minPrice: nextFilters.minPrice,
        maxPrice: nextFilters.maxPrice,
      }));
      setIsFilterPending(false);
      filterTimerRef.current = null;
    }, SHOP_FILTER_DEBOUNCE_MS);
  }, [clearFilterTimer]);

  const scheduleFullFilterApply = useCallback((nextFilters: ProductFilters): void => {
    clearSearchTimer();
    clearFilterTimer();
    setIsSearchPending(false);
    setIsFilterPending(true);

    filterTimerRef.current = setTimeout(() => {
      setAppliedFilters(nextFilters);
      setIsFilterPending(false);
      filterTimerRef.current = null;
    }, SHOP_FILTER_DEBOUNCE_MS);
  }, [clearFilterTimer, clearSearchTimer]);

  const handleSearchChange = useCallback((value: string): void => {
    const trimmedValue = value.trim();
    const nextFilters: ProductFilters = {
      ...filtersRef.current,
      searchInputValue: value,
      isSearching: true,
    };

    updateDraftFilters(nextFilters);
    clearSearchTimer();
    setIsSearchPending(true);

    searchTimerRef.current = setTimeout(() => {
      const currentFilters = filtersRef.current;
      const appliedSearchFilters: ProductFilters = {
        ...currentFilters,
        searchQuery: trimmedValue,
        isSearching: false,
      };

      updateDraftFilters(appliedSearchFilters);
      setAppliedFilters(prev => ({
        ...prev,
        searchInputValue: value,
        searchQuery: trimmedValue,
        isSearching: false,
      }));
      setIsSearchPending(false);
      searchTimerRef.current = null;
    }, SHOP_SEARCH_DEBOUNCE_MS);
  }, [clearSearchTimer, updateDraftFilters]);

  const handleCategoryChange = useCallback((value: string | null): void => {
    const newValue = value || 'all';
    const nextFilters: ProductFilters = {
      ...filtersRef.current,
      selectedCategorySlug: newValue === 'all' ? '' : newValue,
    };

    updateDraftFilters(nextFilters);
    scheduleFilterApply(nextFilters);
  }, [scheduleFilterApply, updateDraftFilters]);

  const handleSortChange = useCallback((value: string | null): void => {
    if (isProductSortValue(value)) {
      const nextFilters: ProductFilters = {
        ...filtersRef.current,
        sortBy: value,
      };

      updateDraftFilters(nextFilters);
      scheduleFilterApply(nextFilters);
    }
  }, [scheduleFilterApply, updateDraftFilters]);

  const handlePriceChange = useCallback((minPrice: string, maxPrice: string): void => {
    const nextFilters: ProductFilters = {
      ...filtersRef.current,
      minPrice,
      maxPrice,
    };

    updateDraftFilters(nextFilters);
    scheduleFilterApply(nextFilters);
  }, [scheduleFilterApply, updateDraftFilters]);

  const clearFilters = useCallback((): void => {
    filtersRef.current = DEFAULT_FILTERS;
    setFilters(DEFAULT_FILTERS);
    scheduleFullFilterApply(DEFAULT_FILTERS);
  }, [scheduleFullFilterApply]);

  // Sync filters to URL as a side effect
  useEffect(() => {
    const newParams = new URLSearchParams();

    if (appliedFilters.searchQuery) {
      newParams.set('search', appliedFilters.searchQuery);
    }

    if (appliedFilters.selectedCategorySlug && appliedFilters.selectedCategorySlug !== 'all') {
      newParams.set('category', appliedFilters.selectedCategorySlug);
    }

    if (appliedFilters.minPrice) {
      newParams.set('min_price', appliedFilters.minPrice);
    }

    if (appliedFilters.maxPrice) {
      newParams.set('max_price', appliedFilters.maxPrice);
    }

    if (appliedFilters.sortBy !== 'newest') {
      newParams.set('sort', appliedFilters.sortBy);
    }

    newParams.set('page', '1');
    router.push(`/products?${newParams.toString()}`, { scroll: false });
  }, [appliedFilters, router]);

  useEffect(() => {
    return () => {
      clearSearchTimer();
      clearFilterTimer();
    };
  }, [clearFilterTimer, clearSearchTimer]);

  const hasActiveFilters: boolean = !!(
    filters.searchInputValue ||
    filters.selectedCategorySlug ||
    filters.minPrice ||
    filters.maxPrice
  );

  return {
    filters,
    appliedFilters,
    hasActiveFilters,
    isFilterPending: isFilterPending || isSearchPending,
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    handlePriceChange,
    clearFilters,
  };
}
