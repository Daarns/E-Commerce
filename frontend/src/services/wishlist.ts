import api from './api';
import { ApiResponse } from '@/types';

/**
 * Wishlist type — defined here because wishlist.ts owns this domain.
 * Product is an optional relation (populated by backend join).
 */
export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  product?: import('@/types').Product;
  created_at: string;
}

export const wishlistService = {
  async getWishlist(limit: number = 20, page: number = 1): Promise<{
    items: Wishlist[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const response = await api.get<ApiResponse<{ items: Wishlist[] }>>(`/wishlist?limit=${limit}&page=${page}`);
    return {
      items: response.data.data?.items || [],
      meta: response.data.meta || { page, limit, total: 0, total_pages: 0 },
    };
  },

  async addToWishlist(productId: string): Promise<Wishlist> {
    const response = await api.post<ApiResponse<Wishlist>>('/wishlist', { product_id: productId });
    return response.data.data!;
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await api.delete('/wishlist', { data: { product_id: productId } });
  },

  async toggleWishlist(productId: string): Promise<{ is_wishlisted: boolean; product: Wishlist | null }> {
    const response = await api.post<ApiResponse<{ is_wishlisted: boolean; product: Wishlist | null }>>(
      '/wishlist/toggle',
      { product_id: productId }
    );
    return response.data.data!;
  },

  async isProductInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<{ is_in_wishlist: boolean }>>(
        '/wishlist/check',
        { product_id: productId }
      );
      return response.data.data?.is_in_wishlist || false;
    } catch {
      return false;
    }
  },
};
