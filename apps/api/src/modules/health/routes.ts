import { healthResponseSchema } from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Env } from '../../env';

/**
 * Public route: no sign-in and no permission check, so uptime monitors and the Render health
 * check can call it. It must never return school data.
 */
export const healthRoutes: FastifyPluginAsyncZod<{ env: Env }> = (app, { env }) => {
  app.get(
    '/health',
    {
      config: { public: true },
      schema: { response: { 200: healthResponseSchema } },
    },
    () => ({ status: 'ok' as const, env: env.APP_ENV }),
  );
  return Promise.resolve();
};
