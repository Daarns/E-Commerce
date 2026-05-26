import type { ProductFilter } from '@/types';

export const PLACEHOLDER_PRODUCT_IMAGE = '/placeholder-product.jpg';

export const PRODUCT_CARD_IMAGE_FRAME_CLASS =
  'relative aspect-[3/4] overflow-hidden rounded-lg bg-muted';

export const PRODUCT_DETAIL_IMAGE_FRAME_CLASS =
  'relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] overflow-hidden rounded-2xl bg-muted';

export const PRODUCT_IMAGE_FIT_CLASS = 'object-contain p-2';

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

export const ADMIN_PRODUCT_STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Arsip' },
] as const;

export const ADMIN_PRODUCT_STATUS_LABELS = {
  active: 'Aktif',
  draft: 'Draft',
  archived: 'Arsip',
} as const;

export type AdminProductStatusValue = keyof typeof ADMIN_PRODUCT_STATUS_LABELS;

export function getAdminProductStatusLabel(status: string | undefined): string {
  if (status === 'active' || status === 'draft' || status === 'archived') {
    return ADMIN_PRODUCT_STATUS_LABELS[status];
  }
  return ADMIN_PRODUCT_STATUS_LABELS.active;
}

export const ADMIN_PRODUCT_SORT_OPTIONS = [
  { value: 'created_at', label: 'Tanggal Dibuat' },
  { value: 'name', label: 'Nama Produk' },
  { value: 'price', label: 'Harga' },
  { value: 'stock', label: 'Stok' },
] as const;

export const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Terbesar / Z-A' },
  { value: 'asc', label: 'Terkecil / A-Z' },
] as const;
