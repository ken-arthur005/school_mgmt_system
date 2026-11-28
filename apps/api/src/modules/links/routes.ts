import {
  errorResponseSchema,
  guardianLinkCreateSchema,
  guardianLinkEditSchema,
  idParamsSchema,
  studentDetailSchema,
} from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf } from '../../plugins/auth';
import type { Services } from '../../services';
import * as service from './service';

const response = {
  200: studentDetailSchema,
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
};

const config = { permission: 'guardians.link' } as const;

export const linkRoutes: FastifyPluginAsyncZod<{ services: Services }> = (app, { services }) => {
  app.post(
    '/students/:id/guardians',
    { config, schema: { params: idParamsSchema, body: guardianLinkCreateSchema, response } },
    (request) =>
      service.addLink(services, authOf(request), request.params.id, request.body, new Date()),
  );

  app.patch(
    '/student-guardians/:id',
    { config, schema: { params: idParamsSchema, body: guardianLinkEditSchema, response } },
    (request) =>
      service.editLink(services, authOf(request), request.params.id, request.body, new Date()),
  );

  app.post(
    '/student-guardians/:id/archive',
    { config, schema: { params: idParamsSchema, response } },
    (request) => service.removeLink(services, authOf(request), request.params.id, new Date()),
  );

  app.post(
    '/student-guardians/:id/restore',
    { config, schema: { params: idParamsSchema, response } },
    (request) => service.restoreLink(services, authOf(request), request.params.id),
  );

  return Promise.resolve();
};
