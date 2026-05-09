import api from '@/services/api';
import { ApiResponse } from '@/types';
import { AdminOrder } from './order.service';
import { RevenueMetrics, OrderMetrics, CustomerMetrics } from './analytics.service';
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
  recent_orders: AdminOrder[];
  low_stock_products: Array<{
    id: string;
    name: string;
    stock_quantity: number;
  }>;
  pending_orders: number;
  unfulfilled_orders: number;
  timestamp: string;
}

// ─── Dashboard Service ────────────────────────────────────────────────────────

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get<ApiResponse<DashboardSummary>>('/admin/dashboard/summary');
    return response.data.data!;
  },
};
