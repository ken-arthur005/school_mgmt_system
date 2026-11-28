import {
  errorResponseSchema,
  guardianDetailSchema,
  guardianEditSchema,
  guardianListQuerySchema,
  guardianListResponseSchema,
  guardianSearchSchema,
  idParamsSchema,
} from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf } from '../../plugins/auth';
import type { Services } from '../../services';
import * as service from './service';

const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
};

export const guardianRoutes: FastifyPluginAsyncZod<{ services: Services }> = (
  app,
  { services },
) => {
  app.get(
    '/guardians',
    {
      config: { permission: 'guardians.read' },
      schema: {
        querystring: guardianListQuerySchema,
        response: { 200: guardianListResponseSchema, ...errors },
      },
    },
    (request) => service.listGuardians(services, authOf(request), request.query),
  );

  // POST so names and phone numbers travel in the body, never in the URL (which gets logged).
  app.post(
    '/guardians/search',
    {
      config: { permission: 'guardians.read' },
      schema: {
        body: guardianSearchSchema,
        response: { 200: guardianListResponseSchema, ...errors },
      },
    },
    (request) => service.searchGuardians(services, authOf(request), request.body),
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
    (request) => service.getGuardian(services, authOf(request), request.params.id),
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
    (request) => service.editGuardian(services, authOf(request), request.params.id, request.body),
  );

  return Promise.resolve();
};
