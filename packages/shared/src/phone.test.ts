import { describe, expect, test } from 'vitest';
import {
  formatGhanaPhone,
  GhanaPhoneError,
  normalizeGhanaPhone,
  tryNormalizeGhanaPhone,
} from './phone';

describe('normalizeGhanaPhone', () => {
  test.each([
    { input: '0241234567', expected: '+233241234567' },
    { input: '024 123 4567', expected: '+233241234567' },
    { input: '024-123-4567', expected: '+233241234567' },
    { input: ' 0241234567 ', expected: '+233241234567' },
    { input: '+233241234567', expected: '+233241234567' },
    { input: '+233 24 123 4567', expected: '+233241234567' },
    { input: '233241234567', expected: '+233241234567' },
    { input: '233 24 123 4567', expected: '+233241234567' },
    { input: '0201234567', expected: '+233201234567' },
    { input: '0551234567', expected: '+233551234567' },
    { input: '0261234567', expected: '+233261234567' },
    { input: '0302123456', expected: '+233302123456' },
  ])('$input → $expected', ({ input, expected }) => {
    expect(normalizeGhanaPhone(input)).toBe(expected);
  });

  test.each([
    '',
    'abc',
    '024123',
    '02412345678',
    '+2348012345678', // Nigeria
    '+447700900123', // UK
    'Kofi',
  ])('rejects %j', (input) => {
    expect(tryNormalizeGhanaPhone(input)).toBeNull();
    expect(() => normalizeGhanaPhone(input)).toThrow(GhanaPhoneError);
  });
});

describe('formatGhanaPhone', () => {
  test.each([
    { input: '+233241234567', expected: '024 123 4567' },
    { input: '+233551234567', expected: '055 123 4567' },
  ])('$input → $expected', ({ input, expected }) => {
    expect(formatGhanaPhone(input)).toBe(expected);
  });
});
