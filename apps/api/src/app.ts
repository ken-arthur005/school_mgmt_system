import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './env';
import { healthRoutes } from './modules/health/routes';
import { registerErrorHandlers } from './plugins/error-handler';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Marks a route that needs no sign-in. The auth hook (Sprint 2) skips these. */
    public?: boolean;
  }
}

/** Builds the Fastify app without listening, so tests can use `app.inject()`. */
export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Never log auth headers or cookies.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandlers(app);

  await app.register(cors, { origin: env.CORS_ORIGINS });
  await app.register(healthRoutes, { env });

  return app;
}
