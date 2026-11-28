import { afterEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { api, ApiError, errorMessage, OfflineError } from './api';
import * as auth from './auth/supabase';

const schema = z.object({ ok: z.boolean() });

function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function setUp(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(auth, 'accessToken').mockResolvedValue('token-1');
  return vi.spyOn(auth, 'signOut').mockResolvedValue();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api', () => {
  test('sends the login token and a JSON body', async () => {
    const fetchMock = answer(200, { ok: true });
    setUp(fetchMock);
    await expect(api('/x', schema, { method: 'POST', body: { q: 'a' } })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/x', 'http://api.test'),
      expect.objectContaining({
        method: 'POST',
        headers: { authorization: 'Bearer token-1', 'content-type': 'application/json' },
        body: '{"q":"a"}',
      }),
    );
  });

  test('passes on the API’s plain-English refusal', async () => {
    const signOut = setUp(answer(403, { error: { code: 'forbidden', message: 'Not yours.' } }));
    const failure = await api('/x', schema).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(errorMessage(failure)).toBe('Not yours.');
    expect(signOut).not.toHaveBeenCalled();
  });

  test('an ended login signs out', async () => {
    const signOut = setUp(answer(401, { error: { code: 'unauthorized', message: 'Sign in.' } }));
    await expect(api('/x', schema)).rejects.toBeInstanceOf(ApiError);
    expect(signOut).toHaveBeenCalled();
  });

  test('no connection is reported as such', async () => {
    setUp(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/x', schema)).rejects.toBeInstanceOf(OfflineError);
  });
});
