import api from '@/services/api';
import { ApiResponse } from '@/types';

export const promoService = {
  /**
   * Validate a promo code against a given subtotal.
   * Returns the discount amount in IDR.
   * Throws an Error with .code attached if validation fails (e.g. expired, invalid).
   */
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
      const error = new Error(backendMsg || 'Kode promo tidak valid');
      (error as Error & { code: string }).code = backendCode;
      throw error;
    }
  },
};
