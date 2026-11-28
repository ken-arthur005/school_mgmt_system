import { describe, expect, test } from 'vitest';
import { fitWithin } from '@/features/photos/resize';
import { isDark, savedTheme } from './theme';

describe('fitWithin', () => {
  test.each([
    { from: [4000, 3000], to: { width: 512, height: 384 } },
    { from: [3000, 4000], to: { width: 384, height: 512 } },
    { from: [200, 100], to: { width: 200, height: 100 } },
    { from: [5000, 3], to: { width: 512, height: 1 } },
  ])('$from → $to', ({ from: [width = 0, height = 0], to }) => {
    expect(fitWithin(width, height, 512)).toEqual(to);
  });
});

describe('theme', () => {
  test.each([
    { choice: 'light', device: true, dark: false },
    { choice: 'dark', device: false, dark: true },
    { choice: 'system', device: true, dark: true },
    { choice: 'system', device: false, dark: false },
  ] as const)('$choice on a dark device: $device → $dark', ({ choice, device, dark }) => {
    expect(isDark(choice, device)).toBe(dark);
  });

  test('anything unexpected in storage means "follow the device"', () => {
    localStorage.setItem('theme', 'purple');
    expect(savedTheme()).toBe('system');
    localStorage.setItem('theme', 'dark');
    expect(savedTheme()).toBe('dark');
    localStorage.clear();
  });
});
