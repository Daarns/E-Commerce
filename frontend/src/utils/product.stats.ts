import { AdminProduct } from '@/services/admin';

export interface ProductStats {
  total: number;
  active: number;
  outOfStock: number;
}

export function calculateProductStats(products: AdminProduct[]): ProductStats {
  return {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    outOfStock: products.filter((p) => p.stock_quantity === 0).length,
  };
}

export function getActiveProductsCount(products: AdminProduct[]): number {
  return products.filter((p) => p.is_active).length;
}

export function getOutOfStockCount(products: AdminProduct[]): number {
  return products.filter((p) => p.stock_quantity === 0).length;
}
