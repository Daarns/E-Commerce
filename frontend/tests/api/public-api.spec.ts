import { expect, test } from '@playwright/test';
import {
  extractArray,
  extractEnvelopeData,
  getRecordField,
  getStringField,
  isApiEnvelope,
  parseJson,
} from '../support/api-helpers';
import { TEST_BACKEND_URL } from '../support/test-env';

const publicReadEndpoints = [
  'ping',
  'categories',
  'categories/tree',
  'categories/root',
  'products?limit=5',
  'products/featured?limit=5',
  'shipping/methods',
  'search?query=dress&limit=5',
  'search/autocomplete?query=dr',
  'search/popular',
  'search/filters',
  'search/trending-products?limit=5',
] as const;

test.describe('public API smoke', () => {
  test('backend health endpoint is available', async ({ request }) => {
    const response = await request.get(`${TEST_BACKEND_URL}/health`);
    expect(response.status()).toBe(200);

    const payload: unknown = await response.json();
    expect(getStringField(payload, 'status')).toBe('healthy');
  });

  for (const endpoint of publicReadEndpoints) {
    test(`GET ${endpoint} returns a non-server-error response`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBeLessThan(500);
      expect(response.status()).not.toBe(401);

      const payload = await parseJson(response);
      if (payload !== undefined) {
        expect(isApiEnvelope(payload) || endpoint === 'ping').toBe(true);
      }
    });
  }

  test('product list is bounded and exposes usable identifiers', async ({ request }) => {
    const response = await request.get('products?limit=5');
    expect(response.status()).toBe(200);

    const payload: unknown = await response.json();
    expect(isApiEnvelope(payload)).toBe(true);
    const data = extractEnvelopeData(payload);
    const products = extractArray(data, ['products', 'items']);
    expect(products.length).toBeLessThanOrEqual(5);

    if (products.length > 0) {
      expect(getStringField(products[0], 'id')).toBeTruthy();
      expect(getStringField(products[0], 'slug')).toBeTruthy();
      expect(getStringField(products[0], 'name')).toBeTruthy();
    }

    const meta = getRecordField(data, 'meta') ?? getRecordField(payload, 'meta');
    if (meta) {
      const limit = meta.limit;
      expect(typeof limit === 'number' || typeof limit === 'string').toBe(true);
    }
  });

  test('an active product detail and related endpoints are readable', async ({ request }) => {
    const listResponse = await request.get('products?limit=1');
    expect(listResponse.status()).toBe(200);
    const listPayload: unknown = await listResponse.json();
    const products = extractArray(extractEnvelopeData(listPayload), ['products', 'items']);
    const slug = getStringField(products[0], 'slug');
    const productID = getStringField(products[0], 'id');

    test.skip(!slug || !productID, 'No active product is available in the test database');

    for (const endpoint of [
      `products/${slug}`,
      `products/${slug}/related`,
      `products/${productID}/reviews`,
      `products/${productID}/review-stats`,
    ]) {
      const response = await request.get(endpoint);
      expect(response.status()).toBeLessThan(500);
      expect([200, 404]).toContain(response.status());
    }
  });
});
