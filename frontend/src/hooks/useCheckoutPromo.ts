import { useState } from 'react';
import { promoService } from '@/services/promo';

export function useCheckoutPromo() {
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);

  const mapPromoError = (error: unknown): string => {
    const err = error as Error & { code?: string };
    const msg = err?.message?.toLowerCase() ?? '';

    if (msg.includes('already used') || msg.includes('sudah digunakan')) {
      return `Kode promo "${promoCode.toUpperCase()}" sudah pernah Anda gunakan sebelumnya. Silakan gunakan kode promo lain.`;
    }
    if (msg.includes('not found') || msg.includes('invalid') || msg.includes('not valid')) {
      return `Kode promo "${promoCode.toUpperCase()}" tidak ditemukan atau tidak berlaku. Mohon periksa kembali kode yang Anda masukkan.`;
    }
    if (msg.includes('expired')) {
      return `Kode promo "${promoCode.toUpperCase()}" sudah tidak berlaku. Masa berlaku kode ini telah habis.`;
    }
    if (msg.includes('minimum') || msg.includes('min')) {
      return `Total belanja Anda belum memenuhi syarat minimum untuk menggunakan kode promo ini.`;
    }
    if (msg.includes('usage limit') || msg.includes('kuota')) {
      return `Kode promo "${promoCode.toUpperCase()}" telah mencapai batas penggunaan maksimum.`;
    }
    return err?.message || 'Kode promo tidak dapat digunakan. Silakan coba kode lain.';
  };

  const applyPromo = async (subtotal: number): Promise<string | null> => {
    if (!promoCode) return null;
    setIsApplyingPromo(true);
    try {
      const result = await promoService.validatePromoCode(promoCode, subtotal);
      setPromoDiscount(result.discount_amount);
      return null;
    } catch (error) {
      setPromoDiscount(0);
      return mapPromoError(error);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromo = (): void => {
    setPromoCode('');
    setPromoDiscount(0);
  };

  return {
    promoCode,
    setPromoCode,
    promoDiscount,
    isApplyingPromo,
    applyPromo,
    removePromo,
  };
}
