import { expect, test } from '@playwright/test';
import { isApiEnvelope, parseJson } from '../support/api-helpers';

const protectedEndpoints = [
  'auth/me',
  'cart',
  'cart/summary',
  'addresses',
  'orders',
  'notifications',
  'notifications/summary',
  'chat/conversations',
  'account/search/history',
] as const;

const adminEndpoints = [
  'admin/dashboard/summary',
  'admin/products',
  'admin/categories',
  'admin/orders',
  'admin/users',
  'admin/chat/conversations',
  'admin/reviews',
  'admin/promos',
] as const;

test.describe('authentication boundaries', () => {
  for (const endpoint of protectedEndpoints) {
    test(`GET ${endpoint} rejects anonymous access`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
      const payload = await parseJson(response);
      expect(payload === undefined || isApiEnvelope(payload)).toBe(true);
    });
  }

  for (const endpoint of adminEndpoints) {
    test(`GET ${endpoint} rejects anonymous access`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    });
  }

  test('malformed bearer token is rejected', async ({ request }) => {
    const response = await request.get('auth/me', {
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    });

    expect(response.status()).toBe(401);
  });
});
