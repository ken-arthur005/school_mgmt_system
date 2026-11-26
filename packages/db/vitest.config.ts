import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Local runs read TEST_DATABASE_URL from packages/db/.env; CI sets it in the workflow.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
