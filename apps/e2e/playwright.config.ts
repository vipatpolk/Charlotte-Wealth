import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome (Web)',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEB_URL || 'http://localhost:4200',
      },
    },
    {
      name: 'Mobile Chrome (Mobile)',
      use: {
        ...devices['Pixel 7'],
        baseURL: process.env.MOBILE_URL || 'http://localhost:8100',
      },
    },
    {
      name: 'Mobile Safari (Mobile)',
      use: {
        ...devices['iPhone 14'],
        baseURL: process.env.MOBILE_URL || 'http://localhost:8100',
      },
    },
  ],
});
