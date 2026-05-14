import { toNum } from '@/utils/format';
import type { Product, ProductVariant } from '@/types';

export interface ProductPricing {
  regularPrice: number;
  salePrice: number | undefined;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
}

export function calculateDiscountPercentage(
  regularPrice: string | number | undefined | null,
  salePrice: string | number | undefined | null
): number {
  const regular = toNum(regularPrice);
  const sale = toNum(salePrice);

  if (regular <= 0 || sale <= 0 || sale >= regular) {
    return 0;
  }

  return Math.round((1 - sale / regular) * 100);
}

export function getProductPricing(
  product: Product,
  variant?: ProductVariant | null
): ProductPricing {
  const regularPrice = toNum(product.regular_price);
  const salePrice = product.sale_price === undefined ? undefined : toNum(product.sale_price);
  const basePrice = salePrice ?? regularPrice;
  const priceAdjustment = toNum(variant?.price_adjustment);

  return {
    regularPrice,
    salePrice,
    currentPrice: basePrice + priceAdjustment,
    originalPrice: regularPrice + priceAdjustment,
    discountPercentage: calculateDiscountPercentage(regularPrice, salePrice),
  };
}
