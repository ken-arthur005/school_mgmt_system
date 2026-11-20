import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildApp } from '../../app';
import { loadEnv } from '../../env';

const env = loadEnv({
  APP_ENV: 'development',
  LOG_LEVEL: 'silent',
  CORS_ORIGINS: 'http://localhost:5173',
});

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(env);
  });

  afterAll(async () => {
    await app.close();
  });

  test('returns ok with the environment name', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', env: 'development' });
  });

  test('allows the configured web origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('does not allow other origins', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('unknown routes get the standard error shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'not_found', message: 'We could not find what you asked for.' },
    });
  });
});

describe('loadEnv', () => {
  test.each([
    { name: 'missing APP_ENV', input: { CORS_ORIGINS: 'http://localhost:5173' } },
    { name: 'unknown APP_ENV', input: { APP_ENV: 'local', CORS_ORIGINS: 'http://localhost:5173' } },
    { name: 'missing CORS_ORIGINS', input: { APP_ENV: 'development' } },
    { name: 'bad CORS origin', input: { APP_ENV: 'development', CORS_ORIGINS: 'not a url' } },
    {
      name: 'bad PORT',
      input: { APP_ENV: 'development', CORS_ORIGINS: 'http://a.test', PORT: 'x' },
    },
  ])('fails fast on $name', ({ input }) => {
    expect(() => loadEnv(input)).toThrow(/Invalid API environment/);
  });

  test('splits and trims CORS_ORIGINS and applies defaults', () => {
    const parsed = loadEnv({
      APP_ENV: 'staging',
      CORS_ORIGINS: 'http://a.test, https://b.test',
    });
    expect(parsed.CORS_ORIGINS).toEqual(['http://a.test', 'https://b.test']);
    expect(parsed.PORT).toBe(3000);
  });
});
