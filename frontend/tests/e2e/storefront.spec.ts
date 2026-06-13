import { expect, test } from '@playwright/test';
import {
  extractArray,
  extractEnvelopeData,
  getStringField,
  isBackendAvailable,
} from '../support/api-helpers';
import { TEST_API_URL } from '../support/test-env';

test.describe('public storefront', () => {
  test('homepage and navigation render without page exceptions', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'STORE' }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('product listing renders filters or products without layout failure', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    const filterControl = viewportWidth < 768
      ? page.getByRole('button', { name: 'Open filters' })
      : page.getByText('Filters', { exact: true }).first();
    await expect(filterControl).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('active product detail exposes metadata and structured data', async ({ page, request }) => {
    test.skip(!(await isBackendAvailable(request)), 'Backend product API is unavailable');
    const response = await request.get(`${TEST_API_URL}products?limit=1`);
    expect(response.ok()).toBe(true);

    const payload: unknown = await response.json();
    const products = extractArray(extractEnvelopeData(payload), ['products', 'items']);
    const slug = getStringField(products[0], 'slug');
    test.skip(!slug, 'No active product is available');

    await page.goto(`/products/${slug}`);
    await expect(page.locator('main')).toBeVisible();
    const primaryProductImage = page.locator('main img').first();
    await expect(primaryProductImage).toHaveAttribute('loading', 'eager');
    await expect(primaryProductImage).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/products/${slug}$`));
  });
});
