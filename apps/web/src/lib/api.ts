import { errorResponseSchema } from '@school-mgmt/shared';
import type { z } from 'zod';
import { env } from '@/env';
import { accessToken, signOut } from '@/lib/auth/supabase';

/** A refusal from our API, with its plain-English message. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** The request never got an answer: no internet, or the server can't be reached. */
export class OfflineError extends Error {
  override readonly name = 'OfflineError';
  constructor() {
    super('We can’t reach the school server. Check your internet and try again.');
  }
}

const UNKNOWN = 'Something went wrong. Please try again.';

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as it is, with its own content type (photos). */
  file?: Blob;
  signal?: AbortSignal;
}

/**
 * One call to our API: adds the login token, and checks the answer has the shape the shared
 * schema promises. Names and phone numbers go in the body, never in `path`.
 */
export async function api<T extends z.ZodType>(
  path: string,
  schema: T,
  options: Options = {},
): Promise<z.output<T>> {
  const token = await accessToken();
  const headers: Record<string, string> = {};
  if (token !== null) headers.authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.file !== undefined) headers['content-type'] = options.file.type;
  const body = options.file ?? (options.body === undefined ? null : JSON.stringify(options.body));

  let response: Response;
  try {
    response = await fetch(new URL(path, env.VITE_API_URL), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal ?? null,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new OfflineError();
  }

  if (!response.ok) {
    // The login has ended; the app returns to the sign-in screen.
    if (response.status === 401) await signOut();
    const parsed = errorResponseSchema.safeParse(await response.json().catch(() => null));
    throw parsed.success
      ? new ApiError(
          response.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.details,
        )
      : new ApiError(response.status, 'unknown', UNKNOWN);
  }
  return schema.parse(await response.json());
}

/** What to tell the user about a failed call. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof OfflineError ? error.message : UNKNOWN;
}
