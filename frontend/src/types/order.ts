import type { Product, ProductVariantCombination } from './product';

// ─── Status Enums ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'refund_requested'
  | 'refund_rejected'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'unpaid'
  | 'pending_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'expired';

// ─── Order ────────────────────────────────────────────────────────────────────

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
  snap_token?: string;  // Midtrans snap token
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
  snap_token_created_at?: string;
  payment_expires_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  // Relations
  items: OrderItem[];
  status_history?: OrderStatusHistory[];
  refund_images?: OrderRefundImage[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id: string;
  combination_id?: string;
  // Snapshot data from backend
  product_name: string;
  product_sku?: string;
  product_image?: string;
  product?: Product;
  combination?: ProductVariantCombination;
  variant_type?: string;
  variant_value?: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  total_price?: string | number; // alias for subtotal
  created_at?: string;
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

export interface OrderRefundImage {
  id: string;
  order_id: string;
  user_id: string;
  image_url: string;
  refund_attempt?: number;
  position: number;
  created_at: string;
}

// ─── Address ──────────────────────────────────────────────────────────────────
// Address lives here because it is most tightly coupled to orders (checkout/shipping snapshot).

export interface Address {
  id: string;
  user_id?: string;
  recipient_name: string;
  phone: string;
  street_address: string;   // maps to backend address_line1
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}
