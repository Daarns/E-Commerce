import api from '@/services/api';
import { ApiResponse } from '@/types';

// ─── Analytics Types ───────────────────────────────────────────────────────────

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
  completed_orders: number;
  refund_requested_orders: number;
  refunded_orders: number;
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

export interface RevenueTrend {
  month: string;   // e.g. "2025-01" — matches backend MonthlyRevenueTrend
  revenue: number;
  orders: number;
  growth: number;  // % change from previous month
}

export interface AggregatedUserStats {
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

/** Generic analytics wrapper — backend wraps analytics data differently from ApiResponse */
export interface AnalyticsResponse<T> {
  data: T;
  timestamp: string;
}

// ─── Analytics Service ────────────────────────────────────────────────────────

export const analyticsService = {
  async getRevenueMetrics(startDate?: string, endDate?: string): Promise<AnalyticsResponse<RevenueMetrics>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await api.get<AnalyticsResponse<RevenueMetrics>>(
      `/admin/analytics/revenue?${params.toString()}`
    );
    return response.data;
  },

  async getOrderAnalytics(): Promise<AnalyticsResponse<OrderMetrics>> {
    const response = await api.get<AnalyticsResponse<OrderMetrics>>('/admin/analytics/orders');
    return response.data;
  },

  async getCustomerAnalytics(): Promise<AnalyticsResponse<CustomerMetrics>> {
    const response = await api.get<AnalyticsResponse<CustomerMetrics>>('/admin/analytics/customers');
    return response.data;
  },

  async getRevenueTrends(months: number = 12): Promise<RevenueTrend[]> {
    const response = await api.get<ApiResponse<{ trends: RevenueTrend[]; count: number }>>(
      `/admin/analytics/revenue-trends?months=${months}`
    );
    return response.data.data?.trends ?? [];
  },

  async getProductPerformance(
    limit: number = 10,
    offset: number = 0
  ): Promise<AnalyticsResponse<{ products: ProductPerformance[]; total: number }>> {
    const response = await api.get<AnalyticsResponse<{ products: ProductPerformance[]; total: number }>>(
      `/admin/analytics/products?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },
};
