'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category } from '@/types';
import { ProductFilters } from '@/services/admin';
import { categoryService } from '@/services/product';

interface ProductSearchProps {
  onFiltersChange: (filters: ProductFilters) => void;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
}

export function ProductSearch({
  onFiltersChange,
  onSearchChange,
  isLoading = false,
}: ProductSearchProps) {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category_id: '',
    stock_status: undefined,
    min_price: undefined,
    max_price: undefined,
    is_active: undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getCategoryTree();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    onSearchChange?.(value);
  };

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value === '' ? undefined : value,
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Boolean(
    search ||
    filters.category_id ||
    filters.stock_status ||
    filters.min_price ||
    filters.max_price ||
    filters.is_active !== undefined
  );

  const resetFilters = () => {
    setSearch('');
    setFilters({
      search: '',
      category_id: '',
      stock_status: undefined,
      min_price: undefined,
      max_price: undefined,
      is_active: undefined,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    onFiltersChange({
      search: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

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
            onClick={() => handleSearchChange('')}
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
        Advanced Filters
        {hasActiveFilters && (
          <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
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
                value={filters.category_id || ''}
                onValueChange={(value) =>
                  handleFilterChange('category_id', value)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
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
              <Label>Stock Status</Label>
              <Select
                value={filters.stock_status || ''}
                onValueChange={(value) =>
                  handleFilterChange(
                    'stock_status',
                    value as 'in_stock' | 'low_stock' | 'out_of_stock'
                  )
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Status Filter */}
            <div>
              <Label>Status</Label>
              <Select
                value={
                  filters.is_active === undefined
                    ? ''
                    : filters.is_active
                    ? 'active'
                    : 'inactive'
                }
                onValueChange={(value) => {
                  if (value === '') {
                    handleFilterChange('is_active', undefined);
                  } else {
                    handleFilterChange('is_active', value === 'active');
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
                onValueChange={(value) =>
                  handleFilterChange('sort_by', value as any)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="name">Product Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sort_order || 'desc'}
                onValueChange={(value) =>
                  handleFilterChange('sort_order', value as 'asc' | 'desc')
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
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
