// This package has neither DOM nor Node types, but Web Crypto exists in browsers and Node alike.
const webCrypto = (
  globalThis as unknown as { crypto: { getRandomValues<T extends Uint8Array>(array: T): T } }
).crypto;

/**
 * UUIDv7 (RFC 9562): 48-bit Unix milliseconds, then random bits. IDs sort roughly by creation
 * time, which keeps Postgres indexes compact, and devices can create them offline.
 */
export function uuidv7(nowMs: number = Date.now()): string {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs > 0xffff_ffff_ffff) {
    throw new RangeError('uuidv7 timestamp must be a whole number of milliseconds within 48 bits');
  }

  const bytes = webCrypto.getRandomValues(new Uint8Array(16));
  let time = nowMs;
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70; // version 7
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC variant

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Reads the creation time (Unix ms) back out of a UUIDv7. */
export function uuidv7Timestamp(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);
}
