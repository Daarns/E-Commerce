import api from '@/services/api';
import type { ProductVariantCombination, ProductVariantType } from '@/types';
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
  sale_start_date?: string;
  sale_end_date?: string;
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
  variant_types?: AdminVariantTypeInput[];
  combinations?: AdminVariantCombinationInput[];
  variant_images?: AdminVariantImageInput[];
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
  sale_start_date?: string;
  sale_end_date?: string;
  stock_quantity?: number;
  category_id?: string;
  brand?: string;
  sku?: string;
  status?: 'active' | 'draft' | 'archived';
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image?: string;
  image_urls?: string[];          // for updating product images during edit
  variant_types?: AdminVariantTypeInput[];
  combinations?: AdminVariantCombinationInput[];
  variant_images?: AdminVariantImageInput[];
}

export interface AdminVariantTypeInput {
  id?: string;
  name: string;
  is_visual: boolean;
  display_order?: number;
  options: Array<string | AdminVariantOptionInput>;
}

export interface AdminVariantOptionInput {
  id?: string;
  value: string;
}

export interface AdminVariantCombinationInput {
  id?: string;
  option_ids?: string[];
  option_values: string[];
  price_adjustment: number;
  stock_quantity: number;
  sku?: string;
  is_active?: boolean;
}

export interface AdminVariantImageInput {
  option_id?: string;
  option_value: string;
  image_url: string;
}

export interface UploadedProductImage {
  image_url: string;
  width?: number;
  height?: number;
  aspect_ratio?: number;
}

interface AdminProductImage {
  id: string;
  url?: string;
  image_url?: string;
  option_id?: string;
  is_primary: boolean;
  display_order: number;
  width?: number;
  height?: number;
  aspect_ratio?: number;
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
  sale_start_date?: string;
  sale_end_date?: string;
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
  images?: AdminProductImage[];
  variant_types?: ProductVariantType[];
  combinations?: ProductVariantCombination[];
  image_urls?: string[];
  variant_image_urls?: string[];   // variant images for unified gallery display
  display_image_urls?: string[];   // read-only display priority: default images, then variant images
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

interface BackendProductDetailResult {
  product: AdminProduct;
  audit?: {
    version?: number;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
  };
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  min_price?: number;
  max_price?: number;
  status?: 'active' | 'draft' | 'archived';
  sort_by?: 'name' | 'price' | 'stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

function getProductImageUrl(image: AdminProductImage): string | undefined {
  return image.url ?? image.image_url;
}

function normalizeAdminProduct(product: AdminProduct): AdminProduct {
  const allImages = product.images ?? [];
  const defaultImages = allImages.filter((img) => !img.option_id);
  const variantImages = allImages.filter((img) => !!img.option_id);
  const toImageUrls = (images: AdminProductImage[]): string[] => (
    images
      .map(getProductImageUrl)
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
  );

  const defaultImageUrls = toImageUrls(defaultImages);
  const variantImageUrls = toImageUrls(variantImages);

  return {
    ...product,
    price: product.regular_price ?? product.price ?? 0,
    category_name: product.category?.name ?? product.category_name ?? '',
    category_id: product.category_id ?? product.category?.id,
    is_active: product.is_active ?? (product.status === 'active'),
    // Only include general product images (no option_id).
    // Variant images (with option_id) are handled via variant_images payload
    // to avoid syncProductImages inserting duplicates with option_id=NULL.
    image_urls: defaultImageUrls,
    // Variant images for unified gallery display (read-only in image section)
    variant_image_urls: variantImageUrls,
    display_image_urls: [...defaultImageUrls, ...variantImageUrls],
  };
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
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);

    const response = await api.get<ApiResponse<BackendProductListResult>>(
      `/admin/products?${params.toString()}`
    );
    const raw = response.data.data;

    // Map backend models.Product → AdminProduct (flatten nested fields)
    const products: AdminProduct[] = (raw?.products ?? []).map(normalizeAdminProduct);

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
    const response = await api.get<ApiResponse<BackendProductDetailResult>>(`/admin/products/${id}`);
    const product = response.data.data?.product;
    if (!product) {
      throw new Error('Product response is missing product data');
    }

    return {
      data: normalizeAdminProduct(product),
      timestamp: new Date().toISOString(),
    };
  },

  async createProduct(data: CreateProductRequest): Promise<AdminProduct> {
    const response = await api.post<ApiResponse<AdminProduct>>('/admin/products', data);
    const product = response.data.data;
    if (!product) {
      throw new Error('Product response is missing product data');
    }
    return normalizeAdminProduct(product);
  },

  async updateProduct(id: string, data: UpdateProductRequest): Promise<AdminProduct> {
    const { id: _id, ...payload } = data;
    void _id;
    const response = await api.put<ApiResponse<AdminProduct>>(`/admin/products/${id}`, payload);
    const product = response.data.data;
    if (!product) {
      throw new Error('Product response is missing product data');
    }
    return normalizeAdminProduct(product);
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/admin/products/${id}`);
  },

  async uploadProductImage(file: File): Promise<AnalyticsResponse<UploadedProductImage>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<AnalyticsResponse<UploadedProductImage>>(
      '/admin/products/upload-image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async deleteUploadedImage(imageUrl: string): Promise<void> {
    await api.delete('/admin/product-images', { data: { image_url: imageUrl } });
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
