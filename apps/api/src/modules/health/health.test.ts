import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadEnv } from '../../env';
import { startTestApp, type TestContext } from '../../test/helpers';

describe('GET /health', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  test('returns ok with the environment name, without signing in', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', env: 'development' });
  });

  test('allows the configured web origin', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('does not allow other origins', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('unknown routes get the standard error shape', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'not_found', message: 'We could not find what you asked for.' },
    });
  });
});

const VALID = {
  APP_ENV: 'development',
  CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  SUPABASE_URL: 'https://abcd.supabase.co',
};

describe('loadEnv', () => {
  test.each([
    { name: 'missing APP_ENV', input: { ...VALID, APP_ENV: undefined } },
    { name: 'unknown APP_ENV', input: { ...VALID, APP_ENV: 'local' } },
    { name: 'missing CORS_ORIGINS', input: { ...VALID, CORS_ORIGINS: undefined } },
    { name: 'bad CORS origin', input: { ...VALID, CORS_ORIGINS: 'not a url' } },
    { name: 'bad PORT', input: { ...VALID, PORT: 'x' } },
    { name: 'missing DATABASE_URL', input: { ...VALID, DATABASE_URL: undefined } },
    { name: 'missing SUPABASE_URL', input: { ...VALID, SUPABASE_URL: undefined } },
  ])('fails fast on $name', ({ input }) => {
    expect(() => loadEnv(input)).toThrow(/Invalid API environment/);
  });

  test('splits and trims CORS_ORIGINS, trims SUPABASE_URL and applies defaults', () => {
    const parsed = loadEnv({
      ...VALID,
      APP_ENV: 'staging',
      CORS_ORIGINS: 'http://a.test, https://b.test',
      SUPABASE_URL: 'https://abcd.supabase.co/',
    });
    expect(parsed.CORS_ORIGINS).toEqual(['http://a.test', 'https://b.test']);
    expect(parsed.SUPABASE_URL).toBe('https://abcd.supabase.co');
    expect(parsed.PORT).toBe(3000);
  });
});
