import api from '@/services/api';
import { ApiResponse, Order, OrderStatus, PaymentStatus } from '@/types';

// ─── Admin Order Types ────────────────────────────────────────────────────────

export interface AdminOrder extends Order {
  customer_name?: string;
  customer_email?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface UpdateOrderTrackingRequest {
  tracking_number: string;
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
  search?: string;               // order number or customer name
  sort_by?: 'date' | 'amount' | 'status';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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

// ─── Admin Order Service ──────────────────────────────────────────────────────

export const adminOrderService = {
  async getOrders(filters?: OrderFilters): Promise<{
    orders: AdminOrder[];
    meta: { total: number; total_pages: number };
  }> {
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

  async getOrder(orderId: string): Promise<AdminOrder> {
    const response = await api.get<ApiResponse<AdminOrder>>(`/admin/orders/${orderId}`);
    return response.data.data!;
  },

  async updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest
  ): Promise<AdminOrder> {
    const response = await api.put<ApiResponse<AdminOrder>>(
      `/admin/orders/${orderId}/status`,
      request
    );
    return response.data.data!;
  },

  async updateOrderTracking(
    orderId: string,
    request: UpdateOrderTrackingRequest
  ): Promise<AdminOrder> {
    const response = await api.put<ApiResponse<AdminOrder>>(
      `/admin/orders/${orderId}/tracking`,
      request
    );
    return response.data.data!;
  },

  async processRefund(orderId: string, request: ProcessRefundRequest): Promise<AdminOrder> {
    const response = await api.post<ApiResponse<AdminOrder>>(
      `/admin/orders/${orderId}/refund`,
      request
    );
    return response.data.data!;
  },

  async getOrderMetrics(): Promise<AdminOrderMetrics> {
    const response = await api.get<ApiResponse<AdminOrderMetrics>>('/admin/orders/summary');
    return response.data.data!;
  },
};
