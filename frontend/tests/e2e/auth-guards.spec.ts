import { expect, test } from '@playwright/test';
import { isBackendAvailable } from '../support/api-helpers';

test.describe('frontend auth guards', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await isBackendAvailable(request)), 'Backend is required for auth guard checks');
  });

  test('login page remains available to anonymous users', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Welcome Back', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('anonymous admin access is redirected away from protected content', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL((url) => url.pathname === '/login' || url.pathname === '/');

    expect(['/login', '/']).toContain(new URL(page.url()).pathname);
  });

  test('anonymous checkout does not expose checkout actions', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForURL((url) => url.pathname !== '/checkout');

    expect(new URL(page.url()).pathname).not.toBe('/checkout');
  });
});
