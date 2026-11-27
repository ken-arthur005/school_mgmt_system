import { describe, expect, test } from 'vitest';
import { schoolToday } from './dates';

describe('schoolToday', () => {
  test.each([
    { now: '2026-11-27T12:00:00Z', timeZone: 'Africa/Accra', expected: '2026-11-27' },
    { now: '2026-11-27T23:59:59Z', timeZone: 'Africa/Accra', expected: '2026-11-27' },
    { now: '2026-11-28T00:00:00Z', timeZone: 'Africa/Accra', expected: '2026-11-28' },
    // Proves the zone is applied rather than UTC being assumed.
    { now: '2026-11-27T23:30:00Z', timeZone: 'Africa/Lagos', expected: '2026-11-28' },
  ])('$now in $timeZone → $expected', ({ now, timeZone, expected }) => {
    expect(schoolToday(new Date(now), timeZone)).toBe(expected);
  });

  test('defaults to Africa/Accra', () => {
    expect(schoolToday(new Date('2026-09-07T23:59:00Z'))).toBe('2026-09-07');
  });
});
