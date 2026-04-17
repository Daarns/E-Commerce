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
};
