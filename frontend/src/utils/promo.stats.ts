import { PromoCode } from '@/services/admin';

export interface PromoStats {
  total: number;
  active: number;
  expired: number;
}

export function calculatePromoStats(promos: PromoCode[]): PromoStats {
  const now = new Date();
  return {
    total: promos.length,
    active: promos.filter((p) => p.is_active && new Date(p.valid_to) >= now).length,
    expired: promos.filter((p) => new Date(p.valid_to) < now).length,
  };
}

export function getActivePromosCount(promos: PromoCode[]): number {
  return promos.filter((p) => p.is_active).length;
}

export function getExpiredPromosCount(promos: PromoCode[]): number {
  return promos.filter((p) => new Date(p.valid_to) < new Date()).length;
}

export function isPromoExpired(validTo: string): boolean {
  return new Date(validTo) < new Date();
}

export function formatPromoDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDiscountValue(value: number | string, type: 'percentage' | 'fixed'): string {
  if (type === 'percentage') {
    return `${Number(value)}%`;
  }
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}
