import type { Db } from '@school-mgmt/db';
import {
  errorResponseSchema,
  idParamsSchema,
  studentDetailSchema,
  studentEditSchema,
  studentListQuerySchema,
  studentListResponseSchema,
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

export const studentRoutes: FastifyPluginAsyncZod<{ db: Db }> = (app, { db }) => {
  app.get(
    '/students',
    {
      config: { permission: 'students.read' },
      schema: {
        querystring: studentListQuerySchema,
        response: { 200: studentListResponseSchema, ...errors },
      },
    },
    (request) => service.listStudents(db, authOf(request), request.query),
  );

  app.get(
    '/students/:id',
    {
      config: { permission: 'students.read' },
      schema: {
        params: idParamsSchema,
        response: { 200: studentDetailSchema, ...errors },
      },
    },
    (request) => service.getStudent(db, authOf(request), request.params.id),
  );

  app.patch(
    '/students/:id',
    {
      config: { permission: 'students.edit' },
      schema: {
        params: idParamsSchema,
        body: studentEditSchema,
        response: { 200: studentDetailSchema, 409: errorResponseSchema, ...errors },
      },
    },
    (request) => service.editStudent(db, authOf(request), request.params.id, request.body),
  );

  return Promise.resolve();
};
