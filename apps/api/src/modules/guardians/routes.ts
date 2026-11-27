import type { Db } from '@school-mgmt/db';
import {
  errorResponseSchema,
  guardianDetailSchema,
  guardianEditSchema,
  guardianListQuerySchema,
  guardianListResponseSchema,
  idParamsSchema,
} from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf } from '../../plugins/auth';
import * as service from './service';

const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
};

export const guardianRoutes: FastifyPluginAsyncZod<{ db: Db }> = (app, { db }) => {
  app.get(
    '/guardians',
    {
      config: { permission: 'guardians.read' },
      schema: {
        querystring: guardianListQuerySchema,
        response: { 200: guardianListResponseSchema, ...errors },
      },
    },
    (request) => service.listGuardians(db, authOf(request), request.query),
  );

  app.get(
    '/guardians/:id',
    {
      config: { permission: 'guardians.read' },
      schema: {
        params: idParamsSchema,
        response: { 200: guardianDetailSchema, ...errors },
      },
    },
    (request) => service.getGuardian(db, authOf(request), request.params.id),
  );

  app.patch(
    '/guardians/:id',
    {
      // Either is enough here; the service limits contact-only editors to contact fields.
      config: { permission: ['guardians.edit', 'guardians.edit_contact'] },
      schema: {
        params: idParamsSchema,
        body: guardianEditSchema,
        response: { 200: guardianDetailSchema, ...errors },
      },
    },
    (request) => service.editGuardian(db, authOf(request), request.params.id, request.body),
  );

  return Promise.resolve();
};
