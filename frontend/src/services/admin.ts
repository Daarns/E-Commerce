import api from '@/services/api';
import { Order, OrderStatus, PaymentStatus, User } from '@/types';
import { ApiResponse } from '@/types';

// Analytics Types
export interface RevenueMetrics {
  total_revenue: number;
  average_order_value: number;
  highest_order: number;
  lowest_order: number;
  period: string;
  currency: string;
  timestamp: string;
}

export interface OrderMetrics {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  average_order_value: number;
  status_breakdown: Record<string, number>;
  payment_methods: Record<string, number>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    product_slug: string;
    sales_count: number;
    total_revenue: number;
    average_price: number;
    rank: number;
  }>;
  timestamp: string;
}

export interface CustomerMetrics {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  return_customers: number;
  average_order_count: number;
  customer_lifetime_value: number;
  customer_segments: Record<string, number>;
  timestamp: string;
}

export interface DashboardSummary {
  overview: {
    total_revenue: number;
    total_orders: number;
    total_customers: number;
    pending_orders: number;
    unfulfilled_orders: number;
    avg_order_value: number;
    active_customers: number;
    low_stock_products: number;
  };
  revenue_metrics: RevenueMetrics;
  order_analytics: OrderMetrics;
  customer_analytics: CustomerMetrics;
  recent_orders: AdminOrder[];  // Use full AdminOrder type for consistency
  low_stock_products: Array<{
    id: string;
    name: string;
    stock_quantity: number;
  }>;
  pending_orders: number;
  unfulfilled_orders: number;
  timestamp: string;
}

export interface RevenueTrend {
  month: string;       // e.g. "2025-01" — matches backend MonthlyRevenueTrend
  revenue: number;
  orders: number;
  growth: number;      // % change from previous month
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  product_slug: string;
  category_name: string;
  total_sales: number;
  total_revenue: number;
  average_rating: number;
  current_stock: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  rank: number;
  last_sold_date?: string;
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

// Mirrors backend CreateProductInput (services/product/product_service.go)
export interface CreateProductRequest {
  name: string;                  // required, min=2
  description?: string;
  short_description?: string;
  regular_price: number;         // required (maps to regular_price in backend)
  sale_price?: number;
  stock_quantity: number;        // required, min=0
  category_id?: string;          // *string in backend — optional
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

// Input for creating a variant (after product is created)
export interface CreateVariantInput {
  variant_type: string;          // e.g. "size", "color"
  variant_value: string;         // e.g. "M", "Red"
  price_adjustment?: number;     // added to regular_price
  stock_quantity: number;
  sku_suffix?: string;
  image_url?: string;
  is_active?: boolean;
}

// AdminProduct mirrors the backend models.Product JSON shape returned by
// AdminListProducts / AdminGetProduct endpoints.
export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  slug: string;
  sku?: string;
  brand?: string;
  // Go decimal.Decimal is serialized to JSON as string (e.g. "150000.00")
  regular_price: string | number;
  sale_price?: string | number;
  discount_percentage?: number;
  stock_quantity: number;
  status: string;   // "active" | "draft" | "archived"
  is_featured: boolean;
  version?: number;  // optimistic locking version
  // Nested category relation from GORM Preload
  category_id?: string;
  category?: { id: string; name: string; slug: string };
  // Alias helpers for backward-compat with product-table
  category_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  // Images from images relation
  images?: Array<{ id: string; url: string; is_primary: boolean; display_order: number }>;
  image_urls?: string[];
  // Pricing alias used by product-table (mapped from regular_price)
  price: string | number;
  // Ratings
  rating?: number;
  review_count?: number;
  // SEO
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

// Raw shape that backend /admin/products returns inside response.data
interface BackendProductListResult {
  products: AdminProduct[]; // actually models.Product but we decode into AdminProduct
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

// Order Management Types
export interface AdminOrder extends Order {
  customer_name?: string;
  customer_email?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface ProcessRefundRequest {
  amount: number;
  reason: string;
  notes?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  min_amount?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
  search?: string; // order number or customer name
  sort_by?: 'date' | 'amount' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface AdminOrderMetrics {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
}

// Admin API Service
export const adminService = {
  // Dashboard
  getDashboardSummary: async () => {
    const response = await api.get<ApiResponse<DashboardSummary>>(
      '/admin/dashboard/summary'
    );
    return response.data.data!;
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
    const response = await api.get<ApiResponse<{ trends: RevenueTrend[]; count: number }>>(
      `/admin/analytics/revenue-trends?months=${months}`
    );
    return response.data.data?.trends ?? [];
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

    // Backend returns: { success: true, data: { products: models.Product[], total, page, limit, total_pages } }
    const response = await api.get<ApiResponse<BackendProductListResult>>(
      `/admin/products?${params.toString()}`
    );

    const raw = response.data.data;

    // Map backend models.Product → frontend AdminProduct
    const products: AdminProduct[] = (raw?.products ?? []).map((p) => ({
      ...p,
      // price alias → regular_price (decimal string or number)
      price: p.regular_price ?? p.price ?? 0,
      // Flatten category relation to category_name for the table
      category_name: p.category?.name ?? p.category_name ?? '',
      // is_active derived from status field
      is_active: p.is_active ?? (p.status === 'active'),
      // Flatten images array → image_urls string array
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

  getProduct: async (id: string) => {
    const response = await api.get<AnalyticsResponse<AdminProduct>>(
      `/admin/products/${id}`
    );
    return response.data;
  },

  createProduct: async (data: CreateProductRequest) => {
    // Strip image_urls from payload — images are attached separately after creation
    const { image_urls, ...payload } = data;
    void image_urls; // intentionally unused in this call
    const response = await api.post<ApiResponse<AdminProduct>>(
      '/admin/products',
      payload
    );
    return response.data.data!;
  },

  updateProduct: async (id: string, data: UpdateProductRequest) => {
    const { id: _id, ...payload } = data;
    void _id;
    const response = await api.put<ApiResponse<AdminProduct>>(
      `/admin/products/${id}`,
      payload
    );
    return response.data.data!;
  },

  deleteProduct: async (id: string) => {
    await api.delete(`/admin/products/${id}`);
  },

  /** POST /api/v1/admin/products/:id/variants — add a variant after product is created */
  addProductVariant: async (productId: string, data: CreateVariantInput) => {
    const response = await api.post<ApiResponse<unknown>>(
      `/admin/products/${productId}/variants`,
      data
    );
    return response.data.data;
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

  // Order Management
  getOrders: async (filters?: OrderFilters & { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.payment_status) params.append('payment_status', filters.payment_status);
      if (filters.min_amount) params.append('min_amount', filters.min_amount.toString());
      if (filters.max_amount) params.append('max_amount', filters.max_amount.toString());
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const response = await api.get<ApiResponse<{ orders: AdminOrder[] }>>(
      `/admin/orders?${params.toString()}`
    );
    return {
      orders: response.data.data?.orders || [],
      meta: response.data.meta || { total: 0, total_pages: 0 },
    };
  },

  getOrder: async (orderId: string) => {
    const response = await api.get<ApiResponse<AdminOrder>>(`/admin/orders/${orderId}`);
    return response.data.data!;
  },

  updateOrderStatus: async (orderId: string, request: UpdateOrderStatusRequest) => {
    const response = await api.put<ApiResponse<AdminOrder>>(
      `/admin/orders/${orderId}/status`,
      request
    );
    return response.data.data!;
  },

  processRefund: async (orderId: string, request: ProcessRefundRequest) => {
    const response = await api.post<ApiResponse<AdminOrder>>(
      `/admin/orders/${orderId}/refund`,
      request
    );
    return response.data.data!;
  },

  getOrderMetrics: async (): Promise<AdminOrderMetrics> => {
    const response = await api.get<ApiResponse<AdminOrderMetrics>>('/admin/orders/summary');
    return response.data.data!;
  },


  // User Management Methods

  // Shape of the /admin/users response data object
  getUsers: async (filters?: UserFilters, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
      if (filters.search) params.append('search', filters.search);
      if (filters.createdAfter) params.append('created_after', filters.createdAfter);
      if (filters.createdBefore) params.append('created_before', filters.createdBefore);
      if (filters.lastLoginAfter) params.append('last_login_after', filters.lastLoginAfter);
      if (filters.lastLoginBefore) params.append('last_login_before', filters.lastLoginBefore);
    }

    interface UsersResponseData {
      data: AdminUser[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      };
    }
    const response = await api.get<ApiResponse<UsersResponseData>>(
      `/admin/users?${params.toString()}`
    );
    return {
      data: response.data.data?.data || [],
      pagination: response.data.data?.pagination,
    };
  },

  getUser: async (userId: string) => {
    const response = await api.get<ApiResponse<AdminUser>>(`/admin/users/${userId}`);
    return response.data.data!;
  },

  updateUserRole: async (userId: string, newRole: 'customer' | 'admin') => {
    const response = await api.put<ApiResponse<AdminUser>>(`/admin/users/${userId}/role`, {
      new_role: newRole,
    });
    return response.data.data!;
  },

  updateUserStatus: async (userId: string, newStatus: 'active' | 'suspended' | 'banned', reason?: string) => {
    const response = await api.put<ApiResponse<AdminUser>>(`/admin/users/${userId}/status`, {
      new_status: newStatus,
      reason,
    });
    return response.data.data!;
  },

  getUserActivityLog: async (userId: string, limit: number = 20) => {
    const response = await api.get<ApiResponse<UserActivity[]>>(`/admin/users/${userId}/activity`, {
      params: { limit },
    });
    return response.data.data!;
  },

  getUserMetrics: async () => {
    const response = await api.get<ApiResponse<UserMetrics>>('/admin/users/metrics');
    return response.data.data!;
  },
};

// ─── Promo Code Types ─────────────────────────────────────────────────────────

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  /** decimal.Decimal serialized as string by Go */
  discount_value: string | number;
  min_order_amount: string | number;
  max_discount_amount?: string | number;
  usage_limit?: number;
  usage_count: number;
  usage_limit_per_user: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
  created_at: string;
  updated_at: string;
}

export interface PromoListResult {
  promo_codes: PromoCode[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PromoListFilters {
  code?: string;
  is_active?: string; // "true" | "false" | ""
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface CreatePromoInput {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_limit_per_user?: number;
  valid_from: string; // ISO 8601 e.g. "2025-01-01T00:00:00Z"
  valid_to: string;
  is_active?: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
}

export interface UpdatePromoInput {
  description?: string;
  discount_value?: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  usage_limit?: number;
  usage_limit_per_user?: number;
  valid_to?: string;
  is_active?: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
}

// ─── Promo Service ────────────────────────────────────────────────────────────

export const promoAdminService = {
  /** GET /api/v1/admin/promos — list with filters & pagination */
  list: async (filters: PromoListFilters = {}): Promise<PromoListResult> => {
    const q = new URLSearchParams();
    if (filters.code)       q.set('code', filters.code);
    if (filters.is_active !== undefined && filters.is_active !== '')
                            q.set('is_active', filters.is_active);
    if (filters.sort_by)    q.set('sort_by', filters.sort_by);
    if (filters.sort_order) q.set('sort_order', filters.sort_order);
    q.set('page',      String(filters.page      ?? 1));
    q.set('page_size', String(filters.page_size ?? 20));

    const res = await api.get<ApiResponse<PromoListResult>>(
      `/admin/promos?${q.toString()}`
    );
    return res.data.data!;
  },

  /** GET /api/v1/admin/promos/:id — single promo */
  get: async (id: string): Promise<PromoCode> => {
    const res = await api.get<ApiResponse<PromoCode>>(`/admin/promos/${id}`);
    return res.data.data!;
  },

  /** POST /api/v1/admin/promos — create promo */
  create: async (data: CreatePromoInput): Promise<PromoCode> => {
    const res = await api.post<ApiResponse<PromoCode>>('/admin/promos', data);
    return res.data.data!;
  },

  /** PUT /api/v1/admin/promos/:id — full or partial update */
  update: async (id: string, data: UpdatePromoInput): Promise<PromoCode> => {
    const res = await api.put<ApiResponse<PromoCode>>(`/admin/promos/${id}`, data);
    return res.data.data!;
  },

  /** DELETE /api/v1/admin/promos/:id — delete promo */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/promos/${id}`);
  },

  /** Convenience: toggle is_active */
  toggleActive: async (id: string, currentState: boolean): Promise<PromoCode> => {
    return promoAdminService.update(id, { is_active: !currentState });
  },
};


// User Management Types
export interface AdminUser extends User {
  last_login?: string;
  status: 'active' | 'suspended' | 'banned';
  total_orders: number;
  total_spent: number;
}

export interface UserActivity {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface UserMetrics {
  total_users: number;
  active_users: number;
  suspended_users: number;
  banned_users: number;
}

export interface UserFilters {
  status?: 'active' | 'suspended' | 'banned';
  role?: 'customer' | 'admin';
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

export interface UpdateUserRoleRequest {
  user_id: string;
  new_role: 'customer' | 'admin';
}

export interface UpdateUserStatusRequest {
  user_id: string;
  new_status: 'active' | 'suspended' | 'banned';
  reason?: string;
}
