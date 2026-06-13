import type { Product } from '@/types';

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-test-id',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test product description',
    regular_price: '100000',
    sku: 'TEST-SKU',
    stock_quantity: 2,
    status: 'active',
    is_featured: false,
    images: [],
    created_at: '2026-06-13T00:00:00Z',
    updated_at: '2026-06-13T00:00:00Z',
    ...overrides,
  };
}
