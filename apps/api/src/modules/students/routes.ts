import {
  errorResponseSchema,
  idParamsSchema,
  medicalNoteCreateSchema,
  studentDetailSchema,
  studentEditSchema,
  studentListQuerySchema,
  studentListResponseSchema,
  studentSearchSchema,
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

export const studentRoutes: FastifyPluginAsyncZod<{ services: Services }> = (app, { services }) => {
  const changed = { 200: studentDetailSchema, 409: errorResponseSchema, ...errors };

  app.get(
    '/students',
    {
      config: { permission: 'students.read' },
      schema: {
        querystring: studentListQuerySchema,
        response: { 200: studentListResponseSchema, ...errors },
      },
    },
    (request) => service.listStudents(services, authOf(request), request.query),
  );

  // POST so names and phone numbers travel in the body, never in the URL (which gets logged).
  app.post(
    '/students/search',
    {
      config: { permission: 'students.read' },
      schema: {
        body: studentSearchSchema,
        response: { 200: studentListResponseSchema, ...errors },
      },
    },
    (request) => service.searchStudents(services, authOf(request), request.body),
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
    (request) => service.getStudent(services, authOf(request), request.params.id),
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
    (request) => service.editStudent(services, authOf(request), request.params.id, request.body),
  );

  app.post(
    '/students/:id/medical-notes',
    {
      config: { permission: 'medical_notes.edit' },
      schema: { params: idParamsSchema, body: medicalNoteCreateSchema, response: changed },
    },
    (request) => service.addMedicalNote(services, authOf(request), request.params.id, request.body),
  );

  app.post(
    '/medical-notes/:id/archive',
    {
      config: { permission: 'medical_notes.edit' },
      schema: { params: idParamsSchema, response: changed },
    },
    (request) =>
      service.setMedicalNoteArchived(services, authOf(request), request.params.id, new Date()),
  );

  app.post(
    '/medical-notes/:id/restore',
    {
      config: { permission: 'medical_notes.edit' },
      schema: { params: idParamsSchema, response: changed },
    },
    (request) => service.setMedicalNoteArchived(services, authOf(request), request.params.id, null),
  );

  return Promise.resolve();
};
