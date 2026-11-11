import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/start-test-server.mjs',
    url: 'http://127.0.0.1:3100/login',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/eduhelp_test',
      NEXTAUTH_SECRET: 'local-test-only-not-a-production-secret',
      NEXTAUTH_URL: 'http://127.0.0.1:3100',
      DISABLE_INTERNAL_CRON: 'true',
    },
  },
});
