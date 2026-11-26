import { appEnvSchema } from '@school-mgmt/shared';
import { z } from 'zod';

const envSchema = z.object({
  APP_ENV: appEnvSchema,
  DATABASE_URL: z.url(),
});

export type DbEnv = z.infer<typeof envSchema>;

/** Reads and validates the database scripts' environment. Throws so scripts fail fast. */
export function loadDbEnv(source: Record<string, string | undefined> = process.env): DbEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid database environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Scripts that wipe data must never run against production. */
export function assertNotProduction(env: DbEnv): void {
  if (env.APP_ENV === 'production') {
    throw new Error('Refusing to run: APP_ENV is production. This script deletes data.');
  }
}
