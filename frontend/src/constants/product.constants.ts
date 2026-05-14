import type { ProductFilter } from '@/types';

export const PLACEHOLDER_PRODUCT_IMAGE = '/placeholder-product.jpg';

export const LOW_STOCK_THRESHOLD = 10;

export const PRODUCT_STOCK_STATUS = {
  inStock: { label: 'In Stock', variant: 'default' },
  lowStock: { label: 'Low Stock', variant: 'secondary' },
  outOfStock: { label: 'Out of Stock', variant: 'destructive' },
} as const;

export const OUT_OF_STOCK_LABEL = PRODUCT_STOCK_STATUS.outOfStock.label;

export const SHOP_PRODUCT_SORT_OPTIONS: Array<{
  value: NonNullable<ProductFilter['sort_by']>;
  label: string;
}> = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

export const ADMIN_PRODUCT_STOCK_STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
] as const;

export const ADMIN_PRODUCT_ACTIVE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export const ADMIN_PRODUCT_SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'name', label: 'Product Name' },
  { value: 'price', label: 'Price' },
  { value: 'stock', label: 'Stock' },
] as const;

export const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
] as const;
