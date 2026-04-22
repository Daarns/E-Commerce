import api from './api';
import { ApiResponse, Order, Address } from '@/types';

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
}

export const orderService = {
  async checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const response = await api.post<ApiResponse<CheckoutResult>>('/checkout', input);
    return response.data.data!;
  },

  async getOrders(page: number = 1, limit: number = 20): Promise<{ orders: Order[]; meta: { total: number; total_pages: number } }> {
    const response = await api.get<ApiResponse<{ orders: Order[] }>>(`/orders?page=${page}&limit=${limit}`);
    return {
      orders: response.data.data?.orders || [],
      meta: {
        total: response.data.meta?.total ?? 0,
        total_pages: response.data.meta?.total_pages ?? 1,
      },
    };
  },

  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return response.data.data!;
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/cancel`);
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
    }>>(`/orders/${orderId}/sync-payment`, midtransOrderId ? { midtrans_order_id: midtransOrderId } : {});
    return response.data.data!;
  },
};

export const addressService = {
  async getAddresses(): Promise<Address[]> {
    const response = await api.get<ApiResponse<{ addresses: Address[] }>>('/addresses');
    return response.data.data?.addresses || [];
  },

  async createAddress(address: Omit<Address, 'id'>): Promise<Address> {
    const response = await api.post<ApiResponse<Address>>('/addresses', address);
    return response.data.data!;
  },

  async updateAddress(id: string, address: Partial<Address>): Promise<Address> {
    const response = await api.put<ApiResponse<Address>>(`/addresses/${id}`, address);
    return response.data.data!;
  },

  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },

  async setDefaultAddress(id: string): Promise<Address> {
    const response = await api.put<ApiResponse<Address>>(`/addresses/${id}/default`);
    return response.data.data!;
  },
};

export const promoService = {
  async validatePromoCode(code: string, subtotal: number): Promise<{ discount_amount: number }> {
    try {
      const response = await api.post<ApiResponse<{ discount: string }>>('/promo-codes/validate', {
        code,
        subtotal,
      });
      const discount = parseFloat(response.data.data?.discount ?? '0');
      return { discount_amount: isNaN(discount) ? 0 : discount };
    } catch (err: unknown) {
      // Extract backend error message from Axios response body
      const axiosErr = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      const backendMsg = axiosErr?.response?.data?.error?.message ?? '';
      const backendCode = axiosErr?.response?.data?.error?.code ?? '';
      // Attach both for caller to use
      const error = new Error(backendMsg || 'Kode promo tidak valid');
      (error as Error & { code: string }).code = backendCode;
      throw error;
    }
  },
};
