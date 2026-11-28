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
import { familyRoutes } from './modules/families/routes';
import { healthRoutes } from './modules/health/routes';
import { linkRoutes } from './modules/links/routes';
import { meRoutes } from './modules/me/routes';
import { photoRoutes } from './modules/photos/routes';
import type { PhotoStorage } from './modules/photos/storage';
import { staffRoutes } from './modules/staff/routes';
import { studentRoutes } from './modules/students/routes';
import { registerAuth } from './plugins/auth';
import { registerErrorHandlers } from './plugins/error-handler';

export interface AppDeps {
  db: Db;
  /** Supabase's public signing keys. server.ts fetches them; tests pass a local key set. */
  jwks: JWTVerifyGetKey;
  /** Where photo files are kept. */
  photos: PhotoStorage;
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

  // The default list leaves out PATCH and PUT, so browsers would refuse to send edits.
  await app.register(cors, { origin: env.CORS_ORIGINS, methods: ['GET', 'POST', 'PATCH', 'PUT'] });
  await app.register(healthRoutes, { env });
  const services = { db: deps.db, photos: deps.photos, log: app.log };
  await app.register(meRoutes, { services });
  await app.register(studentRoutes, { services });
  await app.register(guardianRoutes, { services });
  await app.register(linkRoutes, { services });
  await app.register(familyRoutes, { services });
  await app.register(staffRoutes, { services });
  await app.register(photoRoutes, { services });

  return app;
}
