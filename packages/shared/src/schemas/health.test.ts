import { describe, expect, test } from 'vitest';
import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  test.each([
    { input: { status: 'ok', env: 'development' }, valid: true },
    { input: { status: 'ok', env: 'production' }, valid: true },
    { input: { status: 'down', env: 'production' }, valid: false },
    { input: { status: 'ok', env: 'local' }, valid: false },
    { input: { status: 'ok' }, valid: false },
    { input: null, valid: false },
  ])('$input → valid: $valid', ({ input, valid }) => {
    expect(healthResponseSchema.safeParse(input).success).toBe(valid);
  });
});
