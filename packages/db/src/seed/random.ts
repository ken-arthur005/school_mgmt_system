/**
 * Small seeded random generator (mulberry32). The same seed always produces the same school,
 * so tests can rely on the seed's shape without pinning every generated name.
 */
export class Random {
  #state: number;

  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  /** A float in [0, 1). */
  next(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** A whole number in [min, max], both included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error('Cannot pick from an empty list');
    }
    return item;
  }

  /** Picks a value using relative weights, e.g. [['a', 3], ['b', 1]] picks 'a' three times as often. */
  weighted<T>(options: readonly (readonly [T, number])[]): T {
    const total = options.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.next() * total;
    for (const [value, weight] of options) {
      roll -= weight;
      if (roll < 0) {
        return value;
      }
    }
    const last = options.at(-1);
    if (last === undefined) {
      throw new Error('Cannot pick from an empty list');
    }
    return last[0];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      const a = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = a;
    }
    return copy;
  }

  digits(count: number): string {
    return Array.from({ length: count }, () => String(this.int(0, 9))).join('');
  }
}
