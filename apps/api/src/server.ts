import { buildApp } from './app';
import { loadEnv } from './env';

const env = loadEnv();
const app = await buildApp(env);

function shutdown(signal: NodeJS.Signals): void {
  app.log.info({ signal }, 'shutting down');
  app.close().then(
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
