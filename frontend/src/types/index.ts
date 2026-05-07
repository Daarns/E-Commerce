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

// Cart types
export interface Cart {
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  subtotal: string | number; // decimal string from Go
  item_count: number;
}

export interface CartItem {
  id: string;
  user_id?: string;
  session_id?: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  price: string | number; // snapshot price per unit (decimal string)
  created_at?: string;
  updated_at?: string;
  // Relations (populated by backend)
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
  // Status (both for compatibility)
  order_status: OrderStatus;
  status?: OrderStatus; // alias for order_status
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_provider?: string;
  payment_transaction_id?: string;
  payment_url?: string; // Midtrans payment URL
  snap_token?: string; // Midtrans snap token
  // Shipping address (snapshot — flat fields, not nested object)
  shipping_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  shipping_method?: string;
  tracking_number?: string;
  // Shipping address as nested object (for convenience)
  shipping_address?: {
    recipient_name: string;
    phone: string;
    street_address: string;
    address_line2?: string;
    city: string;
    province: string;
    postal_code: string;
  };
  // Pricing (decimal comes as string from Go)
  subtotal: string | number;
  shipping_cost: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total: string | number;
  total_amount?: string | number; // alias for total
  // Notes
  customer_notes?: string;
  admin_notes?: string;
  // Timestamps
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  // Relations
  items: OrderItem[];
  status_history?: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string;
  to_status: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'expired';

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id: string;
  variant_id?: string;
  // Snapshot data from backend
  product_name: string;
  product_sku?: string;
  product_image?: string; // Product image for display
  variant_type?: string;
  variant_value?: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  total_price?: string | number; // alias for subtotal
  created_at?: string;
}

export interface Address {
  id: string;
  user_id?: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
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
