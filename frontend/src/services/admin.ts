import api from '@/services/api';

// Analytics Types
export interface RevenueMetrics {
  total_revenue: number;
  average_order_value: number;
  min_revenue: number;
  max_revenue: number;
  period_label: string;
}

export interface OrderMetrics {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

export interface CustomerMetrics {
  total_customers: number;
  new_customers: number;
  regular_customers: number;
  vip_customers: number;
  average_lifetime_value: number;
  total_customer_lifetime_value: number;
}

export interface DashboardSummary {
  revenue: RevenueMetrics;
  orders: OrderMetrics;
  customers: CustomerMetrics;
  timestamp: string;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  orders_count: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
  average_rating: number;
  review_count: number;
  stock_quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface UserActivity {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
}

export interface AnalyticsResponse<T> {
  data: T;
  timestamp: string;
}

// Product Management Types
export interface CreateProductRequest {
  name: string;
  description: string;
  category_id: string;
  subcategory_id?: string;
  price: number;
  cost_price?: number;
  discount_percentage?: number;
  stock_quantity: number;
  sku?: string;
  slug?: string;
  is_active?: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  subcategory_id?: string;
  subcategory_name?: string;
  price: number;
  cost_price?: number;
  discount_percentage?: number;
  stock_quantity: number;
  sku?: string;
  slug: string;
  is_active: boolean;
  image_urls: string[];
  rating: number;
  review_count: number;
  meta_title?: string;
  meta_description?: string;
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

// Admin API Service
export const adminService = {
  // Dashboard
  getDashboardSummary: async () => {
    const response = await api.get<AnalyticsResponse<DashboardSummary>>(
      '/admin/dashboard/summary'
    );
    return response.data;
  },

  // Analytics - Revenue
  getRevenueMetrics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get<AnalyticsResponse<RevenueMetrics>>(
      `/admin/analytics/revenue?${params.toString()}`
    );
    return response.data;
  },

  // Analytics - Orders
  getOrderAnalytics: async () => {
    const response = await api.get<AnalyticsResponse<OrderMetrics>>(
      '/admin/analytics/orders'
    );
    return response.data;
  },

  // Analytics - Customers
  getCustomerAnalytics: async () => {
    const response = await api.get<AnalyticsResponse<CustomerMetrics>>(
      '/admin/analytics/customers'
    );
    return response.data;
  },

  // Analytics - Revenue Trends
  getRevenueTrends: async (months: number = 12) => {
    const response = await api.get<AnalyticsResponse<RevenueTrend[]>>(
      `/admin/analytics/revenue-trends?months=${months}`
    );
    return response.data;
  },

  // Analytics - Product Performance
  getProductPerformance: async (limit: number = 10, offset: number = 0) => {
    const response = await api.get<
      AnalyticsResponse<{
        products: ProductPerformance[];
        total: number;
      }>
    >(`/admin/analytics/products?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // User Management
  getUserActivity: async (limit: number = 20, offset: number = 0) => {
    const response = await api.get<
      AnalyticsResponse<{
        users: UserActivity[];
        total: number;
      }>
    >(`/admin/users/activity?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  disableUser: async (userId: string) => {
    const response = await api.post<{ success: boolean }>(
      `/admin/users/${userId}/disable`
    );
    return response.data;
  },

  enableUser: async (userId: string) => {
    const response = await api.post<{ success: boolean }>(
      `/admin/users/${userId}/enable`
    );
    return response.data;
  },

  // Product Management
  getProducts: async (filters?: ProductFilters, page: number = 1, limit: number = 20) => {
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

    const response = await api.get<AnalyticsResponse<ProductsResponse>>(
      `/admin/products?${params.toString()}`
    );
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get<AnalyticsResponse<AdminProduct>>(
      `/admin/products/${id}`
    );
    return response.data;
  },

  createProduct: async (data: CreateProductRequest) => {
    const response = await api.post<AnalyticsResponse<AdminProduct>>(
      '/admin/products',
      data
    );
    return response.data;
  },

  updateProduct: async (id: string, data: UpdateProductRequest) => {
    const response = await api.put<AnalyticsResponse<AdminProduct>>(
      `/admin/products/${id}`,
      data
    );
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(
      `/admin/products/${id}`
    );
    return response.data;
  },

  uploadProductImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<AnalyticsResponse<{ image_url: string }>>(
      '/admin/products/upload-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  bulkDeleteProducts: async (ids: string[]) => {
    const response = await api.post<{ success: boolean; deleted_count: number }>(
      '/admin/products/bulk-delete',
      { ids }
    );
    return response.data;
  },

  bulkUpdateStock: async (updates: Array<{ product_id: string; quantity: number }>) => {
    const response = await api.post<{ success: boolean; updated_count: number }>(
      '/admin/products/bulk-stock',
      { updates }
    );
    return response.data;
  },
};
