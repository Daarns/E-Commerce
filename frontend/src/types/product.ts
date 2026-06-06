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
  variant_types?: ProductVariantType[];
  combinations?: ProductVariantCombination[];
  effective_price?: string | number;
  avg_rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  option_id?: string;
  url?: string;
  image_url?: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  display_order?: number;
  width?: number;
  height?: number;
  aspect_ratio?: number;
}

export interface ProductVariantType {
  id: string;
  product_id: string;
  name: string;
  is_visual: boolean;
  display_order: number;
  options: ProductVariantOption[];
}

export interface ProductVariantOption {
  id: string;
  variant_type_id: string;
  value: string;
  display_order: number;
  variant_type?: ProductVariantType;
}

export interface ProductVariantCombination {
  id: string;
  product_id: string;
  option_ids?: string[];
  options?: ProductVariantOption[];
  price_adjustment: string | number;
  stock_quantity: number;
  sku: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  is_active?: boolean;
  children?: Category[];
  product_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFilter {
  page?: number;
  cursor?: string;
  limit?: number;
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name_asc' | 'name_desc';
  status?: string;
}
