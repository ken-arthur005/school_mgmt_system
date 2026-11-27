import type { ErrorResponse } from '@school-mgmt/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ApiError } from './errors';

/**
 * Every error leaves the API as `{ error: { code, message, details? } }` with plain-English
 * messages. Stack traces and internal messages are logged, never sent to clients.
 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    const body: ErrorResponse = {
      error: { code: 'not_found', message: 'We could not find what you asked for.' },
    };
    return reply.status(404).send(body);
  });

  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      const body: ErrorResponse = {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      };
      return reply.status(error.statusCode).send(body);
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const body: ErrorResponse = {
        error: {
          code: 'validation_error',
          message: 'Some of the information sent is not valid.',
          details: error.validation.map((issue) => ({
            path: issue.instancePath,
            message: issue.message,
          })),
        },
      };
      return reply.status(400).send(body);
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'request failed');
      const body: ErrorResponse = {
        error: {
          code: 'internal_error',
          message: 'Something went wrong on our side. Please try again.',
        },
      };
      return reply.status(500).send(body);
    }

    const body: ErrorResponse = {
      error: { code: error.code.toLowerCase(), message: 'The request could not be completed.' },
    };
    return reply.status(statusCode).send(body);
  });
}
