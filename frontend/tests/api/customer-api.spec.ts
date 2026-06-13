import { expect, test } from '@playwright/test';
import {
  bearer,
  extractArray,
  extractEnvelopeData,
  getStringField,
  login,
} from '../support/api-helpers';
import {
  customerCredentials,
  secondCustomerCredentials,
} from '../support/test-env';

const customerReadEndpoints = [
  'auth/me',
  'cart',
  'cart/summary',
  'addresses',
  'orders?limit=5',
  'notifications?limit=5',
  'notifications/summary',
  'chat/conversations?limit=5',
  'account/search/history?limit=5',
] as const;

test.describe('authenticated customer API', () => {
  test.skip(!customerCredentials, 'Set TEST_CUSTOMER_EMAIL and TEST_CUSTOMER_PASSWORD');

  test('customer read endpoints return successfully', async ({ request }) => {
    if (!customerCredentials) return;
    const session = await login(request, customerCredentials);
    expect(session.user.role).toBe('customer');

    for (const endpoint of customerReadEndpoints) {
      const response = await request.get(endpoint, { headers: bearer(session.access_token) });
      expect(response.status(), endpoint).toBe(200);
    }
  });

  test('customer cannot access representative admin endpoints', async ({ request }) => {
    if (!customerCredentials) return;
    const session = await login(request, customerCredentials);

    for (const endpoint of ['admin/dashboard/summary', 'admin/users', 'admin/orders']) {
      const response = await request.get(endpoint, { headers: bearer(session.access_token) });
      expect(response.status(), endpoint).toBe(403);
    }
  });

  test('customer A cannot read customer B order', async ({ request }) => {
    test.skip(
      !customerCredentials || !secondCustomerCredentials,
      'Set both customer test accounts for IDOR coverage'
    );
    if (!customerCredentials || !secondCustomerCredentials) return;

    const firstSession = await login(request, customerCredentials);
    const secondSession = await login(request, secondCustomerCredentials);
    const secondOrdersResponse = await request.get('orders?limit=1', {
      headers: bearer(secondSession.access_token),
    });
    expect(secondOrdersResponse.status()).toBe(200);

    const payload: unknown = await secondOrdersResponse.json();
    const orders = extractArray(extractEnvelopeData(payload), ['orders', 'items']);
    const orderIdentifier = getStringField(orders[0], 'order_number') ?? getStringField(orders[0], 'id');
    test.skip(!orderIdentifier, 'Second customer has no order for IDOR coverage');

    const forbiddenResponse = await request.get(`orders/${orderIdentifier}`, {
      headers: bearer(firstSession.access_token),
    });
    expect([403, 404]).toContain(forbiddenResponse.status());
  });
});
