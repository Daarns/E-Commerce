import api from '@/services/api';
import { ApiResponse, Order } from '@/types';
import { normalizeOrder } from '@/utils';

interface CheckoutInput {
  address_id: string;
  promo_code?: string;
  payment_method: string;
  shipping_method: string;
  customer_notes?: string;
  customer_email?: string;   // For Midtrans customer details
  idempotency_key: string;
}

interface CheckoutResult {
  order: Order;
  snap_token?: string;     // Midtrans Snap token — pass to window.snap.pay()
  redirect_url?: string;   // Midtrans redirect URL — fallback if Snap.js not loaded
  payment_expires_at?: string;
}

interface PayOrderResult {
  snap_token: string;
  redirect_url?: string;
  payment_expires_at?: string;
}

interface RequestRefundInput {
  reason: string;
  description?: string;
  images?: File[];
}

export const orderService = {
  async checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const response = await api.post<ApiResponse<CheckoutResult>>('/checkout', input, {
      timeout: 30000,
    });
    const result = response.data.data!;
    return {
      ...result,
      order: normalizeOrder(result.order),
    };
  },

  async getOrders(page: number = 1, limit: number = 20): Promise<{ orders: Order[]; meta: { total: number; total_pages: number } }> {
    const response = await api.get<ApiResponse<{ orders: Order[] }>>(`/orders?page=${page}&limit=${limit}`);
    return {
      orders: response.data.data?.orders.map(normalizeOrder) || [],
      meta: {
        total: response.data.meta?.total ?? 0,
        total_pages: response.data.meta?.total_pages ?? 1,
      },
    };
  },

  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return normalizeOrder(response.data.data!);
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/cancel`);
    return normalizeOrder(response.data.data!);
  },

  async confirmReceived(orderId: string): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/confirm-received`);
    return normalizeOrder(response.data.data!);
  },

  async requestRefund(orderId: string, input: RequestRefundInput): Promise<Order> {
    const formData = new FormData();
    formData.append('reason', input.reason);
    if (input.description) {
      formData.append('description', input.description);
    }
    input.images?.forEach((image) => {
      formData.append('images', image);
    });

    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/refund-request`, formData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return normalizeOrder(response.data.data!);
  },

  async payOrder(orderId: string, customerEmail?: string): Promise<PayOrderResult> {
    const response = await api.post<ApiResponse<PayOrderResult>>(
      `/orders/${orderId}/pay`,
      customerEmail ? { customer_email: customerEmail } : {},
      { timeout: 30000 }
    );
    return response.data.data!;
  },

  async syncPayment(orderId: string, midtransOrderId?: string): Promise<{
    order_id: string;
    transaction_status: string;
    payment_status: string;
    updated: boolean;
  }> {
    const response = await api.post<ApiResponse<{
      order_id: string;
      transaction_status: string;
      payment_status: string;
      updated: boolean;
    }>>(
      `/orders/${orderId}/sync-payment`,
      midtransOrderId ? { midtrans_order_id: midtransOrderId } : {},
      { timeout: 30000 }
    );
    return response.data.data!;
  },
};
