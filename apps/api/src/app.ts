import cors from '@fastify/cors';
import type { Db } from '@school-mgmt/db';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { JWTVerifyGetKey } from 'jose';
import type { Env } from './env';
import { guardianRoutes } from './modules/guardians/routes';
import { healthRoutes } from './modules/health/routes';
import { studentRoutes } from './modules/students/routes';
import { registerAuth } from './plugins/auth';
import { registerErrorHandlers } from './plugins/error-handler';

export interface AppDeps {
  db: Db;
  /** Supabase's public signing keys. server.ts fetches them; tests pass a local key set. */
  jwks: JWTVerifyGetKey;
  /** The clock. Tests fix it so "the current academic year" doesn't drift. */
  now?: () => Date;
}

/** Builds the Fastify app without listening, so tests can use `app.inject()`. */
export async function buildApp(env: Env, deps: AppDeps): Promise<FastifyInstance> {
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
  registerAuth(app, {
    db: deps.db,
    jwks: deps.jwks,
    issuer: `${env.SUPABASE_URL}/auth/v1`,
    now: deps.now ?? (() => new Date()),
  });

  await app.register(cors, { origin: env.CORS_ORIGINS });
  await app.register(healthRoutes, { env });
  await app.register(studentRoutes, { db: deps.db });
  await app.register(guardianRoutes, { db: deps.db });

  return app;
}
