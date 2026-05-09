import api from '@/services/api';
import { ApiResponse } from '@/types';
import { AnalyticsResponse } from './analytics.service';

// ─── Admin Product Types ───────────────────────────────────────────────────────

// Mirrors backend CreateProductInput
export interface CreateProductRequest {
  name: string;                  // required, min=2
  description?: string;
  short_description?: string;
  regular_price: number;         // required
  sale_price?: number;
  stock_quantity: number;        // required, min=0
  category_id?: string;
  brand?: string;
  sku?: string;
  status?: 'active' | 'draft' | 'archived';
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image?: string;
  // image_urls: sent AFTER create via /admin/products/:id/images
  image_urls?: string[];
}

// Mirrors backend UpdateProductInput (all fields are pointers = optional)
export interface UpdateProductRequest {
  id: string;
  version: number;               // required for optimistic locking
  name?: string;
  description?: string;
  short_description?: string;
  regular_price?: number;
  sale_price?: number;
  stock_quantity?: number;
  category_id?: string;
  brand?: string;
  status?: 'active' | 'draft' | 'archived';
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image?: string;
}

export interface CreateVariantInput {
  variant_type: string;          // e.g. "size", "color"
  variant_value: string;         // e.g. "M", "Red"
  price_adjustment?: number;
  stock_quantity: number;
  sku_suffix?: string;
  image_url?: string;
  is_active?: boolean;
}

// AdminProduct mirrors the backend models.Product JSON shape
export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  slug: string;
  sku?: string;
  brand?: string;
  // Go decimal.Decimal serialized as string e.g. "150000.00"
  regular_price: string | number;
  sale_price?: string | number;
  discount_percentage?: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  version?: number;              // optimistic locking version
  category_id?: string;
  category?: { id: string; name: string; slug: string };
  category_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  images?: Array<{ id: string; url: string; is_primary: boolean; display_order: number }>;
  image_urls?: string[];
  price: string | number;        // alias for regular_price (used by product-table)
  rating?: number;
  review_count?: number;
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductsResponse {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface BackendProductListResult {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  min_price?: number;
  max_price?: number;
  is_active?: boolean;
  sort_by?: 'name' | 'price' | 'stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// ─── Admin Product Service ────────────────────────────────────────────────────

export const adminProductService = {
  async getProducts(
    filters?: ProductFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: ProductsResponse }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.stock_status) params.append('stock_status', filters.stock_status);
    if (filters?.min_price) params.append('min_price', filters.min_price.toString());
    if (filters?.max_price) params.append('max_price', filters.max_price.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);

    const response = await api.get<ApiResponse<BackendProductListResult>>(
      `/admin/products?${params.toString()}`
    );
    const raw = response.data.data;

    // Map backend models.Product → AdminProduct (flatten nested fields)
    const products: AdminProduct[] = (raw?.products ?? []).map((p) => ({
      ...p,
      price: p.regular_price ?? p.price ?? 0,
      category_name: p.category?.name ?? p.category_name ?? '',
      is_active: p.is_active ?? (p.status === 'active'),
      image_urls: (p.images ?? []).map((img) => img.url),
    }));

    return {
      data: {
        products,
        total: raw?.total ?? 0,
        page: raw?.page ?? page,
        limit: raw?.limit ?? limit,
        total_pages: raw?.total_pages ?? 0,
      },
    };
  },

  async getProduct(id: string): Promise<AnalyticsResponse<AdminProduct>> {
    const response = await api.get<AnalyticsResponse<AdminProduct>>(`/admin/products/${id}`);
    return response.data;
  },

  async createProduct(data: CreateProductRequest): Promise<AdminProduct> {
    const { image_urls, ...payload } = data;
    void image_urls; // images attached separately after creation
    const response = await api.post<ApiResponse<AdminProduct>>('/admin/products', payload);
    return response.data.data!;
  },

  async updateProduct(id: string, data: UpdateProductRequest): Promise<AdminProduct> {
    const { id: _id, ...payload } = data;
    void _id;
    const response = await api.put<ApiResponse<AdminProduct>>(`/admin/products/${id}`, payload);
    return response.data.data!;
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/admin/products/${id}`);
  },

  async addProductVariant(productId: string, data: CreateVariantInput): Promise<unknown> {
    const response = await api.post<ApiResponse<unknown>>(
      `/admin/products/${productId}/variants`,
      data
    );
    return response.data.data;
  },

  async uploadProductImage(file: File): Promise<AnalyticsResponse<{ image_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<AnalyticsResponse<{ image_url: string }>>(
      '/admin/products/upload-image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async bulkDeleteProducts(ids: string[]): Promise<{ success: boolean; deleted_count: number }> {
    const response = await api.post<{ success: boolean; deleted_count: number }>(
      '/admin/products/bulk-delete',
      { ids }
    );
    return response.data;
  },

  async bulkUpdateStock(
    updates: Array<{ product_id: string; quantity: number }>
  ): Promise<{ success: boolean; updated_count: number }> {
    const response = await api.post<{ success: boolean; updated_count: number }>(
      '/admin/products/bulk-stock',
      { updates }
    );
    return response.data;
  },
};
