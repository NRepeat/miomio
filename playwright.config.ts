import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test-specific env vars (ignored by git)
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // single worker — tests share DB/cart state
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Global setup: authenticate once and save session
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
    },
    // Checkout flow tests — depend on authenticated session
    {
      name: 'checkout',
      testMatch: '**/checkout.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      timeout: 60_000,
    },
    // Collection sorting tests — no auth required
    {
      name: 'collection',
      testMatch: '**/collection-sort.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Collection SEO presence tests — no auth required (Phase 22)
    {
      name: 'collection-seo',
      testMatch: '**/collection-seo.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Only start web server in CI — locally assumes `npm run dev` is already running
  webServer: process.env.CI
    ? {
        command: 'npm run start',
        url: process.env.TEST_BASE_URL || 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
