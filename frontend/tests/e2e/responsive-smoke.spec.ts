import { expect, test } from '@playwright/test';

const responsiveRoutes = ['/', '/products', '/login'] as const;

test.describe('responsive layout smoke', () => {
  for (const route of responsiveRoutes) {
    test(`${route} does not overflow the viewport`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));

      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 2);
    });
  }
});
