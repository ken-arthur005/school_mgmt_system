import { describe, expect, test } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv', () => {
  test.each([
    { name: 'missing APP_ENV', input: {} },
    { name: 'unknown APP_ENV', input: { APP_ENV: 'local' } },
    { name: 'unknown LOG_LEVEL', input: { APP_ENV: 'development', LOG_LEVEL: 'loud' } },
  ])('fails fast on $name', ({ input }) => {
    expect(() => loadEnv(input)).toThrow(/Invalid worker environment/);
  });

  test('applies defaults', () => {
    expect(loadEnv({ APP_ENV: 'staging' })).toEqual({ APP_ENV: 'staging', LOG_LEVEL: 'info' });
  });
});
