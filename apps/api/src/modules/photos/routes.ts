import {
  type Action,
  errorResponseSchema,
  idParamsSchema,
  PHOTO_CONTENT_TYPE,
  PHOTO_MAX_BYTES,
  photoResponseSchema,
} from '@school-mgmt/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf } from '../../plugins/auth';
import type { Services } from '../../services';
import * as service from './service';

const response = {
  200: photoResponseSchema,
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
};

const PEOPLE: readonly { url: string; kind: service.PhotoKind; permission: Action }[] = [
  { url: '/students/:id/photo', kind: 'student', permission: 'photos.edit' },
  { url: '/guardians/:id/photo', kind: 'guardian', permission: 'photos.edit' },
  { url: '/staff/:id/photo', kind: 'staff', permission: 'staff.photo' },
];

/**
 * A photo is sent as the raw JPEG in a PUT body. The parser is registered here only, so no other
 * route accepts files.
 */
export const photoRoutes: FastifyPluginAsyncZod<{ services: Services }> = (app, { services }) => {
  app.addContentTypeParser(
    PHOTO_CONTENT_TYPE,
    { parseAs: 'buffer', bodyLimit: PHOTO_MAX_BYTES },
    (_request, body, done) => {
      done(null, body);
    },
  );

  for (const { url, kind, permission } of PEOPLE) {
    app.put(
      url,
      { config: { permission }, schema: { params: idParamsSchema, response } },
      (request) =>
        service.setPhoto(services, authOf(request), { kind, id: request.params.id }, request.body),
    );
    app.post(
      `${url}/remove`,
      { config: { permission }, schema: { params: idParamsSchema, response } },
      (request) => service.removePhoto(services, authOf(request), { kind, id: request.params.id }),
    );
  }

  app.put('/me/photo', { config: { permission: 'profile.use' }, schema: { response } }, (request) =>
    service.setPhoto(services, authOf(request), { kind: 'me' }, request.body),
  );
  app.post(
    '/me/photo/remove',
    { config: { permission: 'profile.use' }, schema: { response } },
    (request) => service.removePhoto(services, authOf(request), { kind: 'me' }),
  );

  return Promise.resolve();
};
