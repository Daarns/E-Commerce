import { expect, test } from '@playwright/test';
import { bearer, login } from '../support/api-helpers';
import { adminCredentials } from '../support/test-env';

const adminReadEndpoints = [
  'admin/dashboard/summary',
  'admin/analytics/revenue',
  'admin/analytics/orders',
  'admin/analytics/customers',
  'admin/analytics/revenue-trends',
  'admin/analytics/products',
  'admin/products?limit=5',
  'admin/categories',
  'admin/orders?limit=5',
  'admin/orders/summary',
  'admin/users?limit=5',
  'admin/users/metrics',
  'admin/activities?limit=5',
  'admin/activities/summary',
  'admin/search/metrics',
  'admin/chat/summary',
  'admin/chat/conversations?limit=5',
  'admin/reviews?limit=5',
  'admin/promos?limit=5',
] as const;

test.describe('authenticated admin API', () => {
  test.skip(!adminCredentials, 'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD');

  test('admin read endpoints remain available', async ({ request }) => {
    if (!adminCredentials) return;
    const session = await login(request, adminCredentials);
    expect(session.user.role).toBe('admin');

    for (const endpoint of adminReadEndpoints) {
      const response = await request.get(endpoint, { headers: bearer(session.access_token) });
      expect(response.status(), endpoint).toBe(200);
    }
  });
});
