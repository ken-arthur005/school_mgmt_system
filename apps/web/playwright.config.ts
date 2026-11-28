import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The sign-in details come from apps/api/.env, the same file `pnpm auth:dev-logins` uses.
if (existsSync('../api/.env')) {
  process.loadEnvFile('../api/.env');
}

/**
 * End-to-end tests against your local API and web app, signing in to the *dev* Supabase project
 * with the seed logins. Not run in CI (Sprint 10).
 */
export default defineConfig({
  testDir: './e2e',
  // The tests change shared records, so they take turns.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  // The dev database is far away and the dev server builds screens on first use.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @school-mgmt/api dev',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
    },
    { command: 'pnpm dev', url: 'http://localhost:5173', reuseExistingServer: true },
  ],
});
