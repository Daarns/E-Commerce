import api from './api';
import { ApiResponse, Product, Category, ProductFilter } from '@/types';

interface ProductListResponse {
  products: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Review types
export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  review_text?: string;
  helpful_count: number;
  unhelpful_count: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: Record<number, number>;
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  review_text?: string;
}

// Search types
export interface SearchSuggestion {
  query: string;
  search_count: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  execution_time_ms: number;
}

export interface FacetedSearchResponse {
  products: Product[];
  facets: {
    categories?: Array<{ name: string; count: number; id: string }>;
    price_ranges?: Array<{ label: string; count: number; min: number; max: number }>;
  };
  total: number;
}

export interface PopularSearch {
  query: string;
  search_count: number;
  trend?: string;
}

// Wishlist types
export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
}

export const productService = {
  async getProducts(filter?: ProductFilter): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.category_id) params.append('category_id', filter.category_id);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.min_price) params.append('min_price', filter.min_price.toString());
    if (filter?.max_price) params.append('max_price', filter.max_price.toString());
    
    // Map frontend sort values to backend sort_by and sort_order
    if (filter?.sort_by) {
      let sortBy = 'created_at';
      let sortOrder = 'desc';
      
      switch (filter.sort_by) {
        case 'newest':
          sortBy = 'created_at';
          sortOrder = 'desc';
          break;
        case 'price_asc':
          sortBy = 'regular_price';
          sortOrder = 'asc';
          break;
        case 'price_desc':
          sortBy = 'regular_price';
          sortOrder = 'desc';
          break;
        case 'popular':
          sortBy = 'sold_count';
          sortOrder = 'desc';
          break;
        case 'name_asc':
          sortBy = 'name';
          sortOrder = 'asc';
          break;
        case 'name_desc':
          sortBy = 'name';
          sortOrder = 'desc';
          break;
      }
      
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
    }

    const response = await api.get<ApiResponse<{ products: Product[] }>>(`/products?${params}`);
    return {
      products: response.data.data?.products || [],
      meta: response.data.meta || { page: 1, limit: 20, total: 0, total_pages: 0 },
    };
  },

  async getProduct(idOrSlug: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/products/${idOrSlug}`);
    return response.data.data!;
  },

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const response = await api.get<ApiResponse<{ products: Product[] }>>(`/products/featured?limit=${limit}`);
    return response.data.data?.products || [];
  },

  async getRelatedProducts(productId: string, limit: number = 4): Promise<Product[]> {
    const response = await api.get<ApiResponse<{ products: Product[] }>>(`/products/${productId}/related?limit=${limit}`);
    return response.data.data?.products || [];
  },

  async searchProducts(query: string): Promise<Product[]> {
    const response = await api.get<ApiResponse<{ products: Product[] }>>(`/products/search?q=${encodeURIComponent(query)}`);
    return response.data.data?.products || [];
  },

  // Reviews
  async getProductReviews(productId: string, page: number = 1, limit: number = 10, sort_by: string = 'helpful'): Promise<{ reviews: ProductReview[]; meta: { page: number; limit: number; total: number; total_pages: number } }> {
    const response = await api.get<ApiResponse<{ reviews: ProductReview[] }>>(`/products/${productId}/reviews?page=${page}&limit=${limit}&sort_by=${sort_by}`);
    return {
      reviews: response.data.data?.reviews || [],
      meta: response.data.meta || { page, limit, total: 0, total_pages: 0 },
    };
  },

  async getReviewStats(productId: string): Promise<ReviewStats> {
    const response = await api.get<ApiResponse<ReviewStats>>(`/products/${productId}/review-stats`);
    return response.data.data!;
  },

  async createReview(productId: string, input: CreateReviewInput): Promise<ProductReview> {
    const response = await api.post<ApiResponse<ProductReview>>(`/products/${productId}/reviews`, input);
    return response.data.data!;
  },

  async updateReview(productId: string, reviewId: string, input: CreateReviewInput): Promise<ProductReview> {
    const response = await api.put<ApiResponse<ProductReview>>(`/products/${productId}/reviews/${reviewId}`, input);
    return response.data.data!;
  },

  async deleteReview(productId: string, reviewId: string): Promise<void> {
    await api.delete(`/products/${productId}/reviews/${reviewId}`);
  },

  async voteReviewHelpful(reviewId: string, isHelpful: boolean): Promise<void> {
    await api.post(`/reviews/${reviewId}/helpful`, { is_helpful: isHelpful });
  },

  // Search & Discovery
  async searchProductsEnhanced(query: string, categoryId?: string, minPrice?: number, maxPrice?: number, limit: number = 20): Promise<SearchResult> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    if (categoryId) params.append('category_id', categoryId);
    if (minPrice) params.append('min_price', minPrice.toString());
    if (maxPrice) params.append('max_price', maxPrice.toString());

    const response = await api.get<ApiResponse<SearchResult>>(`/search?${params}`);
    return response.data.data!;
  },

  async getSearchAutocomplete(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    const response = await api.get<ApiResponse<{ suggestions: SearchSuggestion[] }>>(`/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data?.suggestions || [];
  },

  async getPopularSearches(limit: number = 10, period: 'today' | 'week' | 'month' | 'all' = 'week'): Promise<PopularSearch[]> {
    const response = await api.get<ApiResponse<{ searches: PopularSearch[] }>>(`/search/popular?limit=${limit}&period=${period}`);
    return response.data.data?.searches || [];
  },

  async getFacetedSearch(query: string, categoryId?: string, minPrice?: number, maxPrice?: number): Promise<FacetedSearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (categoryId) params.append('category_id', categoryId);
    if (minPrice) params.append('min_price', minPrice.toString());
    if (maxPrice) params.append('max_price', maxPrice.toString());

    const response = await api.get<ApiResponse<FacetedSearchResponse>>(`/search/facets?${params}`);
    return response.data.data!;
  },

  async getTrendingProducts(period: 'today' | 'week' | 'month' = 'week', limit: number = 10): Promise<Product[]> {
    const response = await api.get<ApiResponse<{ products: Product[] }>>(`/search/trending-products?period=${period}&limit=${limit}`);
    return response.data.data?.products || [];
  },

  async recordSearchClick(productId: string, query: string): Promise<void> {
    await api.post('/search/click', { product_id: productId, query });
  },
};

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>('/categories');
    return response.data.data?.categories || [];
  },

  async getCategoryTree(): Promise<Category[]> {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>('/categories/tree');
    return response.data.data?.categories || [];
  },

  async getCategory(idOrSlug: string): Promise<Category> {
    const response = await api.get<ApiResponse<Category>>(`/categories/${idOrSlug}`);
    return response.data.data!;
  },

  async getCategoryWithProducts(idOrSlug: string): Promise<{ category: Category; products: Product[] }> {
    const response = await api.get<ApiResponse<{ category: Category; products: Product[] }>>(
      `/categories/${idOrSlug}/products`
    );
    return response.data.data!;
  },
};

// Wishlist service
export const wishlistService = {
  async getWishlist(limit: number = 20, page: number = 1): Promise<{ items: Wishlist[]; meta: { page: number; limit: number; total: number; total_pages: number } }> {
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
    const response = await api.post<ApiResponse<{ is_wishlisted: boolean; product: Wishlist | null }>>('/wishlist/toggle', { 
      product_id: productId 
    });
    return response.data.data!;
  },

  async isProductInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<{ is_in_wishlist: boolean }>>('/wishlist/check', { product_id: productId });
      return response.data.data?.is_in_wishlist || false;
    } catch {
      return false;
    }
  },
};
