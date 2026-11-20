import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Every error leaves the API as `{ error: { code, message, details? } }` with plain-English
 * messages. Stack traces and internal messages are logged, never sent to clients.
 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    const body: ErrorBody = {
      error: { code: 'not_found', message: 'We could not find what you asked for.' },
    };
    return reply.status(404).send(body);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const body: ErrorBody = {
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
      const body: ErrorBody = {
        error: {
          code: 'internal_error',
          message: 'Something went wrong on our side. Please try again.',
        },
      };
      return reply.status(500).send(body);
    }

    const body: ErrorBody = {
      error: { code: error.code.toLowerCase(), message: 'The request could not be completed.' },
    };
    return reply.status(statusCode).send(body);
  });
}
