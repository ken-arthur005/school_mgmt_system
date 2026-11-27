import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export class GhanaPhoneError extends Error {
  override readonly name = 'GhanaPhoneError';
  constructor() {
    super('This is not a valid Ghana phone number.');
  }
}

/**
 * Turns a Ghana number typed any common way ("024 123 4567", "+233 24 123 4567",
 * "233241234567") into E.164 (+233241234567). Returns null when it isn't a valid Ghana number.
 */
export function tryNormalizeGhanaPhone(input: string): string | null {
  const trimmed = input.trim();
  // "23324…" without the plus is common in spreadsheets; libphonenumber would read it as a
  // national number.
  const candidate = /^233\d{9}$/.test(trimmed.replace(/[\s-]/g, ''))
    ? `+${trimmed.replace(/[\s-]/g, '')}`
    : trimmed;
  const parsed = parsePhoneNumberFromString(candidate, 'GH');
  if (parsed === undefined || parsed.country !== 'GH' || !parsed.isValid()) {
    return null;
  }
  return parsed.number;
}

/** Like tryNormalizeGhanaPhone, but throws a GhanaPhoneError for invalid input. */
export function normalizeGhanaPhone(input: string): string {
  const normalized = tryNormalizeGhanaPhone(input);
  if (normalized === null) {
    throw new GhanaPhoneError();
  }
  return normalized;
}

/** E.164 (+233241234567) → the way people write it locally (024 123 4567). */
export function formatGhanaPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164, 'GH');
  return parsed === undefined ? e164 : parsed.formatNational();
}
