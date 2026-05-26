import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category } from '@/types';
import type { ProductFilters } from '@/services/admin';
import { categoryService } from '@/services/product';

type ProductFilterValue = ProductFilters[keyof ProductFilters] | null | '';
type StockStatus = NonNullable<ProductFilters['stock_status']>;
type ProductStatus = NonNullable<ProductFilters['status']>;
type SortBy = NonNullable<ProductFilters['sort_by']>;
type SortOrder = NonNullable<ProductFilters['sort_order']>;

interface UseAdminProductSearchParams {
  onFiltersChange: (filters: ProductFilters) => void;
  onSearchChange?: (search: string) => void;
  onSearchPendingChange?: (isPending: boolean) => void;
}

interface UseAdminProductSearchReturn {
  search: string;
  isExpanded: boolean;
  categories: Category[];
  filters: ProductFilters;
  hasActiveFilters: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  handleSearchChange: (value: string) => void;
  clearSearch: () => void;
  handleFilterChange: (key: keyof ProductFilters, value: ProductFilterValue) => void;
  handleStockStatusChange: (value: string | null) => void;
  handleStatusChange: (value: string | null) => void;
  handleSortByChange: (value: string | null) => void;
  handleSortOrderChange: (value: string | null) => void;
  resetFilters: () => void;
}

const SEARCH_DEBOUNCE_MS = 2500;

const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  search: '',
  category_id: '',
  stock_status: undefined,
  min_price: undefined,
  max_price: undefined,
  status: undefined,
  sort_by: 'created_at',
  sort_order: 'desc',
};

export function useAdminProductSearch({
  onFiltersChange,
  onSearchChange,
  onSearchPendingChange,
}: UseAdminProductSearchParams): UseAdminProductSearchReturn {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_PRODUCT_FILTERS);
  const filtersRef = useRef<ProductFilters>(DEFAULT_PRODUCT_FILTERS);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearchTimer = useCallback((): void => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  const applyFilters = useCallback(
    (nextFilters: ProductFilters): void => {
      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      onFiltersChange(nextFilters);
    },
    [onFiltersChange]
  );

  useEffect(() => {
    let isMounted = true;

    categoryService
      .getCategoryTree()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch((error: unknown) => {
        console.error('Failed to load categories:', error);
      });

    return () => {
      isMounted = false;
      clearSearchTimer();
      onSearchPendingChange?.(false);
    };
  }, [clearSearchTimer, onSearchPendingChange]);

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      clearSearchTimer();
      onSearchPendingChange?.(value.trim().length > 0);

      searchTimeoutRef.current = setTimeout(() => {
        const trimmedValue = value.trim();
        const nextFilters = { ...filtersRef.current, search: trimmedValue };
        applyFilters(nextFilters);
        onSearchChange?.(trimmedValue);
        onSearchPendingChange?.(false);
        searchTimeoutRef.current = null;
      }, SEARCH_DEBOUNCE_MS);
    },
    [applyFilters, clearSearchTimer, onSearchChange, onSearchPendingChange]
  );

  const clearSearch = useCallback(
    (): void => {
      clearSearchTimer();
      onSearchPendingChange?.(false);
      setSearch('');
      const nextFilters = { ...filtersRef.current, search: '' };
      applyFilters(nextFilters);
      onSearchChange?.('');
    },
    [applyFilters, clearSearchTimer, onSearchChange, onSearchPendingChange]
  );

  const handleFilterChange = useCallback(
    (key: keyof ProductFilters, value: ProductFilterValue): void => {
      const nextFilters = {
        ...filtersRef.current,
        [key]: value === '' || value === null ? undefined : value,
      };
      applyFilters(nextFilters);
    },
    [applyFilters]
  );

  const resetFilters = useCallback((): void => {
    clearSearchTimer();
    onSearchPendingChange?.(false);
    setSearch('');
    applyFilters({
      search: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    onSearchChange?.('');
  }, [applyFilters, clearSearchTimer, onSearchChange, onSearchPendingChange]);

  const handleStockStatusChange = useCallback(
    (value: string | null): void => {
      if (value === null) {
        handleFilterChange('stock_status', undefined);
        return;
      }
      handleFilterChange('stock_status', isStockStatus(value) ? value : undefined);
    },
    [handleFilterChange]
  );

  const handleStatusChange = useCallback(
    (value: string | null): void => {
      handleFilterChange('status', value !== null && isProductStatus(value) ? value : undefined);
    },
    [handleFilterChange]
  );

  const handleSortByChange = useCallback(
    (value: string | null): void => {
      if (value !== null && isSortBy(value)) {
        handleFilterChange('sort_by', value);
      }
    },
    [handleFilterChange]
  );

  const handleSortOrderChange = useCallback(
    (value: string | null): void => {
      if (value !== null && isSortOrder(value)) {
        handleFilterChange('sort_order', value);
      }
    },
    [handleFilterChange]
  );

  const hasActiveFilters = Boolean(
    search ||
    filters.category_id ||
    filters.stock_status ||
    filters.min_price ||
    filters.max_price ||
    filters.status
  );

  return {
    search,
    isExpanded,
    categories,
    filters,
    hasActiveFilters,
    setIsExpanded,
    handleSearchChange,
    clearSearch,
    handleFilterChange,
    handleStockStatusChange,
    handleStatusChange,
    handleSortByChange,
    handleSortOrderChange,
    resetFilters,
  };
}

function isStockStatus(value: string): value is StockStatus {
  return value === 'in_stock' || value === 'low_stock' || value === 'out_of_stock';
}

function isProductStatus(value: string): value is ProductStatus {
  return value === 'active' || value === 'draft' || value === 'archived';
}

function isSortBy(value: string): value is SortBy {
  return value === 'name' || value === 'price' || value === 'stock' || value === 'created_at';
}

function isSortOrder(value: string): value is SortOrder {
  return value === 'asc' || value === 'desc';
}
