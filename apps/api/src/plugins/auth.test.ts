import { sql } from 'drizzle-orm';
import { generateKeyPair } from 'jose';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../test/helpers';

let ctx: TestContext;
let headUserId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  headUserId = await lookup(ctx.db).userWithOnlyRole('head');
});

afterAll(async () => {
  await ctx.close();
});

const getStudents = (headers: Record<string, string> = {}) =>
  ctx.app.inject({ method: 'GET', url: '/students', headers });

describe('signing in', () => {
  test('a valid token gets in', async () => {
    const res = await getStudents(bearer(await signToken(headUserId)));
    expect(res.statusCode).toBe(200);
  });

  test('no token → 401', async () => {
    const res = await getStudents();
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 'unauthorized', message: 'Please sign in again to continue.' },
    });
  });

  test.each([
    { name: 'not a JWT', header: 'Bearer nonsense' },
    { name: 'wrong scheme', header: 'Basic abc' },
    { name: 'empty bearer', header: 'Bearer ' },
  ])('$name → 401', async ({ header }) => {
    const res = await getStudents({ authorization: header });
    expect(res.statusCode).toBe(401);
  });

  test.each([
    { name: 'expired', overrides: { expiresAt: new Date('2026-10-15T08:00:00Z') } },
    { name: 'wrong issuer', overrides: { issuer: 'https://other.supabase.co/auth/v1' } },
    { name: 'wrong audience', overrides: { audience: 'anon' } },
  ])('$name token → 401', async ({ overrides }) => {
    const res = await getStudents(bearer(await signToken(headUserId, overrides)));
    expect(res.statusCode).toBe(401);
  });

  test('a token signed with someone else’s key → 401', async () => {
    const { privateKey } = await generateKeyPair('ES256');
    const res = await getStudents(bearer(await signToken(headUserId, { key: privateKey })));
    expect(res.statusCode).toBe(401);
  });

  test('a valid login with no staff account → 403 with a plain message', async () => {
    const res = await getStudents(bearer(await signToken('0190a0a0-0000-7000-8000-000000000000')));
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/not linked to a staff account/);
  });

  test('the System user can never sign in', async () => {
    const rows = await ctx.db.execute<{ id: string }>(
      sql`select id from users where is_system`,
    );
    const res = await getStudents(bearer(await signToken(rows[0]?.id ?? '')));
    expect(res.statusCode).toBe(403);
  });
});

describe('every route declares a permission', () => {
  test('adding a route without one fails straight away', async () => {
    const fresh = await startTestApp();
    try {
      expect(() => fresh.app.get('/oops', () => 'no permission')).toThrow(
        /must declare config.permission/,
      );
    } finally {
      await fresh.close();
    }
  });
});
