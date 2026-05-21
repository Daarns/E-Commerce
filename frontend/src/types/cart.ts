import { Product, ProductVariantCombination } from './product';

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
  combination_id?: string;
  quantity: number;
  price: string | number; // snapshot price per unit (decimal string)
  created_at?: string;
  updated_at?: string;
  // Relations (populated by backend)
  product?: Product;
  combination?: ProductVariantCombination;
}

// CartItem with guaranteed product (after filtering nulls)
export interface ValidCartItem extends CartItem {
  product: Product;
}
