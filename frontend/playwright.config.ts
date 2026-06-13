import { defineConfig, devices } from '@playwright/test';
import { TEST_FRONTEND_URL } from './tests/support/test-env';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/e2e', open: 'never' }]],
  use: {
    baseURL: TEST_FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/support/start-test-server.mjs',
    url: TEST_FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  outputDir: 'test-results/e2e',
});
