import api from './api';
import { ApiResponse, Order, Address } from '@/types';

interface CheckoutInput {
  address_id: string;
  promo_code?: string;
  payment_method: string;
  shipping_method: string;
  customer_notes?: string;
  idempotency_key: string;
}

interface CheckoutResult {
  order: Order;
  payment_url?: string;
  expires_at?: string;
}

export const orderService = {
  async checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const response = await api.post<ApiResponse<CheckoutResult>>('/checkout', input);
    return response.data.data!;
  },

  async getOrders(page: number = 1, limit: number = 10): Promise<{ orders: Order[]; meta: { total: number; total_pages: number } }> {
    const response = await api.get<ApiResponse<{ orders: Order[] }>>(`/orders?page=${page}&limit=${limit}`);
    return {
      orders: response.data.data?.orders || [],
      meta: response.data.meta || { total: 0, total_pages: 0 },
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
  async validatePromoCode(code: string): Promise<{ valid: boolean; discount_type: string; discount_value: number }> {
    const response = await api.post<ApiResponse<{ valid: boolean; discount_type: string; discount_value: number }>>('/promo-codes/validate', { code });
    return response.data.data!;
  },
};
