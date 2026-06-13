import type { Product } from '@/types';
import { normalizeStorageImageUrl } from '@/utils/image-url';

export function buildSeoDescription(product: Product): string {
  const description = product.meta_description || product.short_description || product.description;
  const normalized = description.replace(/\s+/g, ' ').trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

export function getProductSeoImage(product: Product): string | undefined {
  const primaryImage = product.images?.find((image) => image.is_primary) || product.images?.[0];
  return normalizeStorageImageUrl(product.og_image || primaryImage?.url || primaryImage?.image_url);
}
