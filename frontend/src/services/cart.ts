import api from './api';
import { ApiResponse, Cart, CartItem } from '@/types';

interface AddToCartInput {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface UpdateCartItemInput {
  quantity: number;
}

export const cartService = {
  async getCart(): Promise<Cart | null> {
    try {
      const response = await api.get<ApiResponse<Cart>>('/cart');
      return response.data.data || null;
    } catch {
      return null;
    }
  },

  async addToCart(input: AddToCartInput): Promise<CartItem> {
    const response = await api.post<ApiResponse<CartItem>>('/cart/items', input);
    return response.data.data!;
  },

  async updateCartItem(itemId: string, input: UpdateCartItemInput): Promise<CartItem> {
    const response = await api.put<ApiResponse<CartItem>>(`/cart/items/${itemId}`, input);
    return response.data.data!;
  },

  async removeFromCart(itemId: string): Promise<void> {
    await api.delete(`/cart/items/${itemId}`);
  },

  async clearCart(): Promise<void> {
    await api.delete('/cart');
  },

  async getCartSummary(): Promise<{ subtotal: number; item_count: number }> {
    const response = await api.get<ApiResponse<{ subtotal: number; item_count: number }>>('/cart/summary');
    return response.data.data || { subtotal: 0, item_count: 0 };
  },

  async mergeGuestCart(): Promise<Cart> {
    const response = await api.post<ApiResponse<Cart>>('/cart/merge');
    return response.data.data!;
  },
};
