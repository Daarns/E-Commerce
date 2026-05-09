export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  // Go decimal.Decimal serializes to JSON string e.g. "150000.00"
  regular_price: string | number;
  sale_price?: string | number;
  discount_percentage?: number;
  sku: string;
  stock_quantity: number;
  status: 'active' | 'draft' | 'archived';
  is_featured: boolean;
  brand?: string;
  category?: Category;
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
  stock_quantity: number;
  sku_suffix: string;
  image_url?: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  children?: Category[];
  product_count?: number;
}

export interface ProductFilter {
  page?: number;
  limit?: number;
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc';
  status?: string;
}
