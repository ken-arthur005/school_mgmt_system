import { describe, expect, test } from 'vitest';
import { uuidv7, uuidv7Timestamp } from './ids';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  test.each([0, 1, 1_764_115_200_000, 0xffff_ffff_ffff])('encodes timestamp %i', (ms) => {
    const id = uuidv7(ms);
    expect(id).toMatch(UUID_V7);
    expect(uuidv7Timestamp(id)).toBe(ms);
  });

  test.each([-1, 1.5, 0x1_0000_0000_0000, Number.NaN])('rejects timestamp %s', (ms) => {
    expect(() => uuidv7(ms)).toThrow(RangeError);
  });

  test('later timestamps sort after earlier ones', () => {
    const ids = [3, 1, 2].map((offset) => uuidv7(1_764_115_200_000 + offset));
    expect([...ids].sort()).toEqual([ids[1], ids[2], ids[0]]);
  });

  test('ids made in the same millisecond are unique', () => {
    const ids = new Set(Array.from({ length: 10_000 }, () => uuidv7(1_764_115_200_000)));
    expect(ids.size).toBe(10_000);
  });
});
