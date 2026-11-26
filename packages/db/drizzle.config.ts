import { defineConfig } from 'drizzle-kit';

// Only used for `drizzle-kit generate`, which needs no database connection.
// Migrations are applied by `src/scripts/migrate.ts`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  strict: true,
  verbose: true,
});
