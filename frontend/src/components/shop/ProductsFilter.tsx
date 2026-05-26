'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SHOP_PRODUCT_SORT_OPTIONS } from '@/constants/product.constants';
import { Category } from '@/types';
import { ProductFilters } from '@/hooks/useProductFilter';
import { formatCurrency } from '@/utils';

const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 50_000_000;
const PRICE_RANGE_STEP = 50_000;

const capitalizeCategoryName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const parsePriceValue = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampPriceValue = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const toPriceFilterValue = (value: number, boundaryValue: number): string => {
  return value === boundaryValue ? '' : String(value);
};

interface ProductsFilterProps {
  filters: ProductFilters;
  categories: Category[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onSortChange: (value: string | null) => void;
  onPriceChange: (minPrice: string, maxPrice: string) => void;
  onClearFilters: () => void;
}

export function ProductsFilter({
  filters,
  categories,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onPriceChange,
  onClearFilters,
}: ProductsFilterProps) {
  const minPriceValue = clampPriceValue(
    parsePriceValue(filters.minPrice, PRICE_RANGE_MIN),
    PRICE_RANGE_MIN,
    PRICE_RANGE_MAX
  );
  const maxPriceValue = clampPriceValue(
    parsePriceValue(filters.maxPrice, PRICE_RANGE_MAX),
    PRICE_RANGE_MIN,
    PRICE_RANGE_MAX
  );
  const activeMinPrice = Math.min(minPriceValue, maxPriceValue);
  const activeMaxPrice = Math.max(minPriceValue, maxPriceValue);
  const minPercent = ((activeMinPrice - PRICE_RANGE_MIN) / (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) * 100;
  const maxPercent = ((activeMaxPrice - PRICE_RANGE_MIN) / (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) * 100;

  const handleMinRangeChange = (value: string): void => {
    const nextMin = clampPriceValue(Number(value), PRICE_RANGE_MIN, activeMaxPrice);
    onPriceChange(toPriceFilterValue(nextMin, PRICE_RANGE_MIN), filters.maxPrice);
  };

  const handleMaxRangeChange = (value: string): void => {
    const nextMax = clampPriceValue(Number(value), activeMinPrice, PRICE_RANGE_MAX);
    onPriceChange(filters.minPrice, toPriceFilterValue(nextMax, PRICE_RANGE_MAX));
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <Input
          placeholder="Search products..."
          value={filters.searchInputValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select value={filters.selectedCategorySlug || 'all'} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories">
              {filters.selectedCategorySlug && filters.selectedCategorySlug !== 'all'
                ? capitalizeCategoryName(
                    categories.find(c => c.slug === filters.selectedCategorySlug)?.name ||
                      filters.selectedCategorySlug
                  )
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
        <div className="space-y-3 rounded-md border border-border/70 p-3">
          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
            />
            <input
              aria-label="Minimum price"
              type="range"
              min={PRICE_RANGE_MIN}
              max={PRICE_RANGE_MAX}
              step={PRICE_RANGE_STEP}
              value={activeMinPrice}
              onChange={(e) => handleMinRangeChange(e.target.value)}
              className="pointer-events-none absolute inset-0 h-8 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background"
            />
            <input
              aria-label="Maximum price"
              type="range"
              min={PRICE_RANGE_MIN}
              max={PRICE_RANGE_MAX}
              step={PRICE_RANGE_STEP}
              value={activeMaxPrice}
              onChange={(e) => handleMaxRangeChange(e.target.value)}
              className="pointer-events-none absolute inset-0 h-8 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{formatCurrency(activeMinPrice)}</span>
            <span>{formatCurrency(activeMaxPrice)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onPriceChange(e.target.value, filters.maxPrice)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onPriceChange(filters.minPrice, e.target.value)}
          />
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Sort By</label>
        <Select value={filters.sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue>
              {SHOP_PRODUCT_SORT_OPTIONS.find(opt => opt.value === filters.sortBy)?.label || 'Sort by'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SHOP_PRODUCT_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
