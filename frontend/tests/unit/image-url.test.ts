import { describe, expect, it } from 'vitest';
import {
  normalizeStorageImageUrl,
  shouldBypassNextImageOptimizer,
} from '@/utils/image-url';

describe('image URL utilities', () => {
  it('maps local S3 URLs to the SeaweedFS filer URL', () => {
    expect(normalizeStorageImageUrl('http://localhost:8333/product-images/a.webp'))
      .toBe('http://localhost:8888/buckets/product-images/a.webp');
  });

  it('keeps remote URLs unchanged', () => {
    expect(normalizeStorageImageUrl('https://cdn.example.com/a.webp'))
      .toBe('https://cdn.example.com/a.webp');
  });

  it('rejects empty image URLs', () => {
    expect(normalizeStorageImageUrl('   ')).toBeUndefined();
    expect(normalizeStorageImageUrl(undefined)).toBeUndefined();
  });

  it('bypasses optimization for local filer and SVG assets', () => {
    expect(shouldBypassNextImageOptimizer('http://localhost:8333/a.webp')).toBe(true);
    expect(shouldBypassNextImageOptimizer('https://cdn.example.com/icon.svg')).toBe(true);
    expect(shouldBypassNextImageOptimizer('https://cdn.example.com/a.webp')).toBe(false);
  });
});
