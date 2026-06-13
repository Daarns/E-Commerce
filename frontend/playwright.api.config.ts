import { defineConfig } from '@playwright/test';
import { TEST_API_URL } from './tests/support/test-env';

export default defineConfig({
  testDir: './tests/api',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/api', open: 'never' }]],
  use: {
    baseURL: TEST_API_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  outputDir: 'test-results/api',
});
