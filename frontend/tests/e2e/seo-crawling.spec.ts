import { expect, test } from '@playwright/test';

test.describe('SEO and crawler controls', () => {
  test('homepage exposes canonical and social metadata', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/STORE/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\//);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /STORE/);
  });

  test('robots and sitemap endpoints are valid', async ({ request }) => {
    const robotsResponse = await request.get('/robots.txt');
    expect(robotsResponse.status()).toBe(200);
    const robots = await robotsResponse.text();
    expect(robots).toContain('User-Agent: *');
    expect(robots).toMatch(/Allow:|Disallow:/);

    const sitemapResponse = await request.get('/sitemap.xml');
    expect(sitemapResponse.status()).toBe(200);
    expect(sitemapResponse.headers()['content-type']).toContain('xml');
    expect(await sitemapResponse.text()).toContain('<urlset');
  });

  test('private routes send crawler blocking headers', async ({ request }) => {
    for (const route of ['/admin', '/checkout', '/profile', '/orders']) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.status(), route).toBeLessThan(500);
      expect(response.headers()['x-robots-tag'], route).toContain('noindex');
    }
  });
});
