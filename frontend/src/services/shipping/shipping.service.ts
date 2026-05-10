/**
 * Shipping Service — API integration for shipping methods.
 *
 * Backend endpoint: GET /api/v1/shipping/methods (public, no auth required)
 * Source of truth: shipping_methods table in database.
 *
 * Field notes:
 *   price — comes as decimal string from Go (shopspring/decimal), parsed to number here.
 *   orders.shipping_method stores the `code` snapshot, so selectedShipping in checkout
 *   should always hold the code value (e.g. 'regular', 'express').
 */

import api from '@/services/api';
import { ApiResponse } from '@/types';

// Shape returned by backend JSON (matches models.ShippingMethod json tags)
interface BackendShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string;
  price: string | number; // decimal string from Go
  estimated_days_min: number;
  estimated_days_max: number;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  estimated_days_min: number;
  estimated_days_max: number;
  icon: string;
  is_active: boolean;
  display_order: number;
}

/** Build a human-friendly delivery estimate label */
export function formatEstimate(method: ShippingMethod): string {
  if (method.estimated_days_min === 0 && method.estimated_days_max === 0) {
    return 'Hari ini';
  }
  if (method.estimated_days_min === method.estimated_days_max) {
    return `${method.estimated_days_min} hari kerja`;
  }
  return `${method.estimated_days_min}–${method.estimated_days_max} hari kerja`;
}

/** Map backend shape → frontend ShippingMethod */
function mapToFrontend(sm: BackendShippingMethod): ShippingMethod {
  return {
    id: sm.id,
    code: sm.code,
    name: sm.name,
    description: sm.description,
    price: typeof sm.price === 'string' ? parseFloat(sm.price) : sm.price,
    estimated_days_min: sm.estimated_days_min,
    estimated_days_max: sm.estimated_days_max,
    icon: sm.icon,
    is_active: sm.is_active,
    display_order: sm.display_order,
  };
}

const shippingService = {
  /** GET /api/v1/shipping/methods — returns all active methods ordered by display_order */
  async getMethods(): Promise<ShippingMethod[]> {
    const response = await api.get<ApiResponse<BackendShippingMethod[]>>('/shipping/methods');
    return (response.data.data ?? []).map(mapToFrontend);
  },
};

export default shippingService;
