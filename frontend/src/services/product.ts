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

export const productService = {
  async getProducts(filter?: ProductFilter): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.category_id) params.append('category_id', filter.category_id);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.min_price) params.append('min_price', filter.min_price.toString());
    if (filter?.max_price) params.append('max_price', filter.max_price.toString());
    if (filter?.sort_by) params.append('sort_by', filter.sort_by);

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
