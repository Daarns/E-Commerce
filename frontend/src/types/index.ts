// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: 'customer' | 'admin';
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  regular_price: number;
  sale_price?: number;
  discount_percentage?: number;
  sku: string;
  stock_quantity: number;
  status: 'active' | 'draft' | 'archived';
  is_featured: boolean;
  brand?: string;
  category?: Category;
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

// Cart types
export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
  variant?: ProductVariant;
}

// CartItem with guaranteed product (after filtering)
export interface ValidCartItem extends CartItem {
  product: Product;
}

// Order types
export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  shipping_address: Address;
  items: OrderItem[];
  payment_url?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed' 
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'expired';

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_info?: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot?: Product;
}

export interface Address {
  id: string;
  user_id?: string;
  label?: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Filter types
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
