import api from '@/services/api';
import { ApiResponse } from '@/types';

// ─── Admin Promo Types ────────────────────────────────────────────────────────

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
  is_active?: string;            // "true" | "false" | ""
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
  valid_from: string;            // ISO 8601 e.g. "2025-01-01T00:00:00Z"
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

// ─── Admin Promo Service ──────────────────────────────────────────────────────

export const adminPromoService = {
  async list(filters: PromoListFilters = {}): Promise<PromoListResult> {
    const q = new URLSearchParams();
    if (filters.code) q.set('code', filters.code);
    if (filters.is_active !== undefined && filters.is_active !== '') q.set('is_active', filters.is_active);
    if (filters.sort_by) q.set('sort_by', filters.sort_by);
    if (filters.sort_order) q.set('sort_order', filters.sort_order);
    q.set('page', String(filters.page ?? 1));
    q.set('page_size', String(filters.page_size ?? 20));

    const res = await api.get<ApiResponse<PromoListResult>>(`/admin/promos?${q.toString()}`);
    return res.data.data!;
  },

  async get(id: string): Promise<PromoCode> {
    const res = await api.get<ApiResponse<PromoCode>>(`/admin/promos/${id}`);
    return res.data.data!;
  },

  async create(data: CreatePromoInput): Promise<PromoCode> {
    const res = await api.post<ApiResponse<PromoCode>>('/admin/promos', data);
    return res.data.data!;
  },

  async update(id: string, data: UpdatePromoInput): Promise<PromoCode> {
    const res = await api.put<ApiResponse<PromoCode>>(`/admin/promos/${id}`, data);
    return res.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/promos/${id}`);
  },

  async toggleActive(id: string, currentState: boolean): Promise<PromoCode> {
    return adminPromoService.update(id, { is_active: !currentState });
  },
};
