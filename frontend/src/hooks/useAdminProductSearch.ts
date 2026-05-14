import { useCallback, useEffect, useState } from 'react';
import type { Category } from '@/types';
import type { ProductFilters } from '@/services/admin';
import { categoryService } from '@/services/product';

type ProductFilterValue = ProductFilters[keyof ProductFilters] | null | '';
type StockStatus = NonNullable<ProductFilters['stock_status']>;
type SortBy = NonNullable<ProductFilters['sort_by']>;
type SortOrder = NonNullable<ProductFilters['sort_order']>;

interface UseAdminProductSearchParams {
  onFiltersChange: (filters: ProductFilters) => void;
  onSearchChange?: (search: string) => void;
}

interface UseAdminProductSearchReturn {
  search: string;
  isExpanded: boolean;
  categories: Category[];
  filters: ProductFilters;
  hasActiveFilters: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  handleSearchChange: (value: string) => void;
  handleFilterChange: (key: keyof ProductFilters, value: ProductFilterValue) => void;
  handleStockStatusChange: (value: string | null) => void;
  handleSortByChange: (value: string | null) => void;
  handleSortOrderChange: (value: string | null) => void;
  resetFilters: () => void;
}

const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  search: '',
  category_id: '',
  stock_status: undefined,
  min_price: undefined,
  max_price: undefined,
  is_active: undefined,
  sort_by: 'created_at',
  sort_order: 'desc',
};

export function useAdminProductSearch({
  onFiltersChange,
  onSearchChange,
}: UseAdminProductSearchParams): UseAdminProductSearchReturn {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_PRODUCT_FILTERS);

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
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      setFilters((previous) => {
        const nextFilters = { ...previous, search: value };
        onFiltersChange(nextFilters);
        return nextFilters;
      });
      onSearchChange?.(value);
    },
    [onFiltersChange, onSearchChange]
  );

  const handleFilterChange = useCallback(
    (key: keyof ProductFilters, value: ProductFilterValue): void => {
      setFilters((previous) => {
        const nextFilters = {
          ...previous,
          [key]: value === '' || value === null ? undefined : value,
        };
        onFiltersChange(nextFilters);
        return nextFilters;
      });
    },
    [onFiltersChange]
  );

  const resetFilters = useCallback((): void => {
    setSearch('');
    setFilters(DEFAULT_PRODUCT_FILTERS);
    onFiltersChange({
      search: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  }, [onFiltersChange]);

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
    filters.is_active !== undefined
  );

  return {
    search,
    isExpanded,
    categories,
    filters,
    hasActiveFilters,
    setIsExpanded,
    handleSearchChange,
    handleFilterChange,
    handleStockStatusChange,
    handleSortByChange,
    handleSortOrderChange,
    resetFilters,
  };
}

function isStockStatus(value: string): value is StockStatus {
  return value === 'in_stock' || value === 'low_stock' || value === 'out_of_stock';
}

function isSortBy(value: string): value is SortBy {
  return value === 'name' || value === 'price' || value === 'stock' || value === 'created_at';
}

function isSortOrder(value: string): value is SortOrder {
  return value === 'asc' || value === 'desc';
}
