'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category } from '@/types';
import { ProductFilters } from '@/hooks/useProductFilter';

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

const capitalizeCategoryName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
              {sortOptions.find(opt => opt.value === filters.sortBy)?.label || 'Sort by'}
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
