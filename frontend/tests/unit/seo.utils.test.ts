import { describe, expect, it } from 'vitest';
import { buildSeoDescription, getProductSeoImage } from '@/utils/seo.utils';
import { createProduct } from '../support/product-factory';

describe('SEO utilities', () => {
  it('prioritizes meta description and normalizes whitespace', () => {
    const product = createProduct({
      description: 'Fallback description',
      meta_description: '  Product\n description   for SEO  ',
    });

    expect(buildSeoDescription(product)).toBe('Product description for SEO');
  });

  it('limits descriptions to 160 characters', () => {
    const description = buildSeoDescription(createProduct({ description: 'a'.repeat(200) }));

    expect(description).toHaveLength(160);
    expect(description.endsWith('...')).toBe(true);
  });

  it('prioritizes explicit Open Graph and primary product images', () => {
    const primaryImageProduct = createProduct({
      images: [
        { id: 'secondary', image_url: 'https://cdn.example.com/secondary.webp', is_primary: false, sort_order: 1 },
        { id: 'primary', image_url: 'https://cdn.example.com/primary.webp', is_primary: true, sort_order: 0 },
      ],
    });

    expect(getProductSeoImage(primaryImageProduct)).toBe('https://cdn.example.com/primary.webp');
    expect(getProductSeoImage(createProduct({
      og_image: 'https://cdn.example.com/og.webp',
      images: primaryImageProduct.images,
    }))).toBe('https://cdn.example.com/og.webp');
  });
});
