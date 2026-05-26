'use client';

import { motion } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProductFilters } from '@/services/admin';
import {
  ADMIN_PRODUCT_STATUS_FILTER_OPTIONS,
  ADMIN_PRODUCT_SORT_OPTIONS,
  ADMIN_PRODUCT_STOCK_STATUS_OPTIONS,
  SORT_ORDER_OPTIONS,
} from '@/constants/product.constants';
import { useAdminProductSearch } from '@/hooks/useAdminProductSearch';

interface ProductSearchProps {
  onFiltersChange: (filters: ProductFilters) => void;
  onSearchChange?: (search: string) => void;
  onSearchPendingChange?: (isPending: boolean) => void;
  isLoading?: boolean;
}

const ALL_CATEGORIES_VALUE = '__all_categories__';
const ALL_STOCK_STATUSES_VALUE = '__all_stock_statuses__';

export function ProductSearch({
  onFiltersChange,
  onSearchChange,
  onSearchPendingChange,
  isLoading = false,
}: ProductSearchProps) {
  const {
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
  } = useAdminProductSearch({ onFiltersChange, onSearchChange, onSearchPendingChange });

  const selectedCategoryLabel =
    categories.find((category) => category.id === filters.category_id)?.name ?? 'Semua kategori';
  const selectedStockLabel =
    ADMIN_PRODUCT_STOCK_STATUS_OPTIONS.find((option) => option.value === filters.stock_status)?.label ??
    'Semua status';
  const selectedSortLabel =
    ADMIN_PRODUCT_SORT_OPTIONS.find((option) => option.value === filters.sort_by)?.label ??
    'Tanggal Dibuat';
  const selectedSortOrderLabel =
    SORT_ORDER_OPTIONS.find((option) => option.value === filters.sort_order)?.label ??
    'Terbesar / Z-A';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
          disabled={isLoading}
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Advanced Filters Toggle */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
        Filter Lanjutan
      </motion.button>

      {/* Advanced Filters */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 p-4 bg-muted rounded-lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <Label>Category</Label>
              <Select
                value={filters.category_id || ALL_CATEGORIES_VALUE}
                onValueChange={(value) =>
                  handleFilterChange(
                    'category_id',
                    !value || value === ALL_CATEGORIES_VALUE ? undefined : value
                  )
                }
                disabled={isLoading}
              >
                <SelectTrigger className="mt-1 h-10 w-full">
                  <SelectValue placeholder="Semua kategori">{selectedCategoryLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>Semua kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <Label>Status Stok</Label>
              <Select
                value={filters.stock_status || ALL_STOCK_STATUSES_VALUE}
                onValueChange={(value) => handleStockStatusChange(
                  value === ALL_STOCK_STATUSES_VALUE ? null : value
                )}
                disabled={isLoading}
              >
                <SelectTrigger className="mt-1 h-10 w-full">
                  <SelectValue placeholder="Semua status">{selectedStockLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STOCK_STATUSES_VALUE}>Semua status</SelectItem>
                  {ADMIN_PRODUCT_STOCK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={filters.status === undefined ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(null)}
                  disabled={isLoading}
                >
                  Semua
                </Button>
                {ADMIN_PRODUCT_STATUS_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={filters.status === option.value ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isLoading}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <Label className="mb-2 block">Price Range (Rp)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Min price"
                value={filters.min_price || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleFilterChange('min_price', value);
                }}
                disabled={isLoading}
                min="0"
                step="1000"
              />
              <Input
                type="number"
                placeholder="Max price"
                value={filters.max_price || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleFilterChange('max_price', value);
                }}
                disabled={isLoading}
                min="0"
                step="1000"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <Label className="mb-2 block">Sort By</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={filters.sort_by || 'created_at'}
                onValueChange={handleSortByChange}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{selectedSortLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_PRODUCT_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sort_order || 'desc'}
                onValueChange={handleSortOrderChange}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{selectedSortOrderLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_ORDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={resetFilters}
              disabled={isLoading}
              className="w-full"
            >
              Reset Filters
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
