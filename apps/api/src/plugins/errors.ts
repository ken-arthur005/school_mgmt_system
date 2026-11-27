/**
 * An error we expect and can explain to the user. The error handler sends `code` and `message`
 * as they are, so messages must be plain English and never contain personal data.
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const unauthorized = () =>
  new ApiError(401, 'unauthorized', 'Please sign in again to continue.');

export const forbidden = (message = 'You do not have permission to do this.') =>
  new ApiError(403, 'forbidden', message);

export const notFound = (message = 'We could not find what you asked for.') =>
  new ApiError(404, 'not_found', message);

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, 'validation_error', message, details);
