import {
  errorResponseSchema,
  familyAddChildSchema,
  familyCreateSchema,
  familyDetailSchema,
  familyListQuerySchema,
  familyListResponseSchema,
  familyRenameSchema,
  familySearchSchema,
  idParamsSchema,
  siblingAddSchema,
  studentDetailSchema,
} from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authOf } from '../../plugins/auth';
import type { Services } from '../../services';
import * as service from './service';

const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
};

const read = { permission: 'families.read' } as const;
const manage = { permission: 'families.manage' } as const;
const childParamsSchema = z.object({ id: z.uuid(), studentId: z.uuid() });
const family = { 200: familyDetailSchema, ...errors };
const list = { 200: familyListResponseSchema, ...errors };

export const familyRoutes: FastifyPluginAsyncZod<{ services: Services }> = (app, { services }) => {
  app.get(
    '/families',
    { config: read, schema: { querystring: familyListQuerySchema, response: list } },
    (request) => service.listFamilies(services, authOf(request), request.query),
  );

  // POST so names travel in the body, never in the URL (which gets logged).
  app.post(
    '/families/search',
    { config: read, schema: { body: familySearchSchema, response: list } },
    (request) => service.searchFamilies(services, authOf(request), request.body),
  );

  app.get(
    '/families/:id',
    { config: read, schema: { params: idParamsSchema, response: family } },
    (request) => service.getFamily(services, authOf(request), request.params.id),
  );

  app.post(
    '/families',
    { config: manage, schema: { body: familyCreateSchema, response: family } },
    (request) => service.createFamily(services, authOf(request), request.body),
  );

  app.patch(
    '/families/:id',
    {
      config: manage,
      schema: { params: idParamsSchema, body: familyRenameSchema, response: family },
    },
    (request) =>
      service.renameFamily(services, authOf(request), request.params.id, request.body.name),
  );

  app.post(
    '/families/:id/students',
    {
      config: manage,
      schema: { params: idParamsSchema, body: familyAddChildSchema, response: family },
    },
    (request) => service.addChild(services, authOf(request), request.params.id, request.body),
  );

  app.post(
    '/families/:id/students/:studentId/remove',
    { config: manage, schema: { params: childParamsSchema, response: family } },
    (request) =>
      service.removeChild(services, authOf(request), request.params.id, request.params.studentId),
  );

  app.post(
    '/students/:id/siblings',
    {
      config: manage,
      schema: {
        params: idParamsSchema,
        body: siblingAddSchema,
        response: { 200: studentDetailSchema, ...errors },
      },
    },
    (request) => service.addSibling(services, authOf(request), request.params.id, request.body),
  );

  return Promise.resolve();
};
