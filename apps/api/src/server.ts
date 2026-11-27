import { createDb } from '@school-mgmt/db';
import { createRemoteJWKSet } from 'jose';
import { buildApp } from './app';
import { loadEnv } from './env';

const env = loadEnv();
const database = createDb(env.DATABASE_URL);
// Fetched once and cached; jose refetches when Supabase rotates its keys.
const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
const app = await buildApp(env, { db: database.db, jwks });

function shutdown(signal: NodeJS.Signals): void {
  app.log.info({ signal }, 'shutting down');
  app
    .close()
    .then(() => database.close())
    .then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error({ err }, 'error during shutdown');
        process.exit(1);
      },
    );
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

await app.listen({ port: env.PORT, host: env.HOST });
