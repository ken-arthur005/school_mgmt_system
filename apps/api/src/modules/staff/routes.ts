import {
  errorResponseSchema,
  idParamsSchema,
  staffDetailSchema,
  staffListResponseSchema,
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

export const staffRoutes: FastifyPluginAsyncZod<{ services: Services }> = (app, { services }) => {
  app.get(
    '/staff',
    {
      config: { permission: 'staff.read' },
      schema: { response: { 200: staffListResponseSchema, ...errors } },
    },
    (request) => service.listStaff(services, authOf(request)),
  );

  app.get(
    '/staff/:id',
    {
      config: { permission: 'staff.read' },
      schema: { params: idParamsSchema, response: { 200: staffDetailSchema, ...errors } },
    },
    (request) => service.getStaff(services, authOf(request), request.params.id),
  );

  return Promise.resolve();
};
