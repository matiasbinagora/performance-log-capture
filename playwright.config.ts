import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

const localServer: PlaywrightTestConfig['webServer'] = {
  command: 'npm run build && node scripts/prepare-playwright-fixture.mjs && HOST=127.0.0.1 PORT=4173 npx tsx src/server.ts',
  url: 'http://127.0.0.1:4173/health',
  reuseExistingServer: !process.env.CI,
  timeout: 30_000,
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    video: 'on',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  ...(process.env.PLAYWRIGHT_EXTERNAL_SERVER ? {} : { webServer: localServer }),
});
