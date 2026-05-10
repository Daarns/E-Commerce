/**
 * Address Service - API integration for address management
 * Uses the same `api` axios instance as authService.
 *
 * Backend endpoint: /api/v1/addresses (via CartHandler)
 * Field mapping:
 *   backend address_line1 ↔ frontend street_address
 *   backend name (db column) ↔ frontend recipient_name
 *   label & country are frontend-only fields (not stored in backend)
 */

import api from '@/services/api';
import { ApiResponse, Address } from '@/types';

// Shape returned by backend JSON (matches models.Address json tags)
interface BackendAddress {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Payload sent to backend (matches cart.AddressInput)
interface AddressPayload {
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

/** Map backend shape → frontend Address type */
function mapToFrontend(a: BackendAddress): Address {
  return {
    id: a.id,
    user_id: a.user_id,
    recipient_name: a.recipient_name,
    phone: a.phone,
    street_address: a.address_line1,
    address_line2: a.address_line2,
    city: a.city,
    province: a.province,
    postal_code: a.postal_code,
    is_default: a.is_default,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

/** Map frontend Address form → backend payload */
function mapToPayload(form: Partial<Address>): AddressPayload {
  return {
    recipient_name: form.recipient_name ?? '',
    phone: form.phone ?? '',
    address_line1: form.street_address ?? '',
    address_line2: form.address_line2 ?? '',
    city: form.city ?? '',
    province: form.province ?? '',
    postal_code: form.postal_code ?? '',
    is_default: form.is_default ?? false,
  };
}

const addressService = {
  /** GET /api/v1/addresses */
  async getAddresses(): Promise<Address[]> {
    const response = await api.get<ApiResponse<BackendAddress[]>>('/addresses');
    return (response.data.data ?? []).map(mapToFrontend);
  },

  /** POST /api/v1/addresses */
  async createAddress(form: Partial<Address>): Promise<Address> {
    const response = await api.post<ApiResponse<BackendAddress>>(
      '/addresses',
      mapToPayload(form)
    );
    return mapToFrontend(response.data.data!);
  },

  /** PUT /api/v1/addresses/:id */
  async updateAddress(id: string, form: Partial<Address>): Promise<Address> {
    const response = await api.put<ApiResponse<BackendAddress>>(
      `/addresses/${id}`,
      mapToPayload(form)
    );
    return mapToFrontend(response.data.data!);
  },

  /** DELETE /api/v1/addresses/:id */
  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },

  /** PUT /api/v1/addresses/:id/default */
  async setDefault(id: string): Promise<void> {
    await api.put(`/addresses/${id}/default`, {});
  },
};

export default addressService;
