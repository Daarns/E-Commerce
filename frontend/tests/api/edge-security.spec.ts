import { expect, test } from '@playwright/test';
import {
  extractArray,
  extractEnvelopeData,
  getRecordField,
  isApiEnvelope,
  parseJson,
} from '../support/api-helpers';

function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  if (typeof value !== 'object' || value === null) return false;

  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase();
    return normalized.includes('password_hash') ||
      normalized === 'password' ||
      normalized.includes('jwt_secret') ||
      containsSensitiveKey(child);
  });
}

test.describe('API edge and security smoke', () => {
  test('oversized pagination is rejected or capped', async ({ request }) => {
    const response = await request.get('products?limit=999999');
    expect(response.status()).toBeLessThan(500);
    expect([200, 400, 422]).toContain(response.status());

    if (response.status() === 200) {
      const payload: unknown = await response.json();
      const data = extractEnvelopeData(payload);
      const products = extractArray(data, ['products', 'items']);
      const meta = getRecordField(data, 'meta') ?? getRecordField(payload, 'meta');
      const reportedLimit = meta?.limit;

      expect(products.length).toBeLessThanOrEqual(100);
      if (typeof reportedLimit === 'number') expect(reportedLimit).toBeLessThanOrEqual(100);
    }
  });

  test('SQL-like search input never produces a server error', async ({ request }) => {
    const response = await request.get("products?search='%20OR%20'1'%3D'1&limit=5");
    expect(response.status()).toBeLessThan(500);
  });

  test('script input is not reflected as executable HTML', async ({ request }) => {
    const marker = '<script>alert(1)</script>';
    const response = await request.get(`products?search=${encodeURIComponent(marker)}&limit=5`);
    expect(response.status()).toBeLessThan(500);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.text()).not.toContain(marker);
  });

  test('malformed auth JSON returns a client error without internals', async ({ request }) => {
    const response = await request.post('auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: '{invalid-json',
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    expect(body.toLowerCase()).not.toContain('stack trace');
    expect(body.toLowerCase()).not.toContain('select * from');
  });

  test('public product responses do not expose credential fields', async ({ request }) => {
    const response = await request.get('products?limit=5');
    expect(response.status()).toBe(200);
    const payload = await parseJson(response);
    expect(payload !== undefined && isApiEnvelope(payload)).toBe(true);
    expect(containsSensitiveKey(payload)).toBe(false);
  });
});
