import {
  classListResponseSchema,
  errorResponseSchema,
  homeSummarySchema,
  meSchema,
} from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf } from '../../plugins/auth';
import type { Services } from '../../services';
import * as service from './service';

const errors = {
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
};

export const meRoutes: FastifyPluginAsyncZod<{ services: Services }> = (app, { services }) => {
  app.get(
    '/me',
    {
      config: { permission: 'profile.use' },
      schema: { response: { 200: meSchema, ...errors } },
    },
    (request) => service.getMe(services, authOf(request)),
  );

  app.get(
    '/home/summary',
    {
      config: { permission: 'profile.use' },
      schema: { response: { 200: homeSummarySchema, ...errors } },
    },
    (request) => service.getHomeSummary(services, authOf(request)),
  );

  app.get(
    '/classes',
    {
      config: { permission: 'students.read' },
      schema: { response: { 200: classListResponseSchema, ...errors } },
    },
    (request) => service.listClasses(services, authOf(request)),
  );

  return Promise.resolve();
};
