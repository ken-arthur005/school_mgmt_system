import {
  formatGhanaPhone,
  type GuardianDetail,
  type guardianEditSchema,
  tryNormalizeGhanaPhone,
} from '@school-mgmt/shared';
import type { z } from 'zod';

/** What the edit form holds: plain text boxes, plus the WhatsApp tick. */
export interface GuardianFormValues {
  surname: string;
  firstName: string;
  otherNames: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsappPhone: string;
  email: string;
  occupation: string;
  address: string;
  digitalAddress: string;
  /** "Also use this for WhatsApp", offered when the main phone is also the WhatsApp number. */
  whatsappFollows: boolean;
}

type Changes = z.input<typeof guardianEditSchema>;
type TextField = Exclude<keyof GuardianFormValues, 'whatsappFollows'>;

const PHONES: readonly TextField[] = ['primaryPhone', 'secondaryPhone', 'whatsappPhone'];
/** Clearing one of these removes the value; the rest must be filled in. */
const OPTIONAL: readonly TextField[] = [
  'otherNames',
  'secondaryPhone',
  'email',
  'occupation',
  'address',
  'digitalAddress',
];

export function guardianFormValues(guardian: GuardianDetail): GuardianFormValues {
  const phone = (value: string | null) => (value === null ? '' : formatGhanaPhone(value));
  return {
    surname: guardian.surname,
    firstName: guardian.firstName,
    otherNames: guardian.otherNames ?? '',
    primaryPhone: phone(guardian.primaryPhone),
    secondaryPhone: phone(guardian.secondaryPhone),
    whatsappPhone: phone(guardian.whatsappPhone),
    email: guardian.email ?? '',
    occupation: guardian.occupation ?? '',
    address: guardian.address ?? '',
    digitalAddress: guardian.digitalAddress ?? '',
    whatsappFollows: guardian.whatsappPhone === guardian.primaryPhone,
  };
}

const samePhone = (a: string, b: string) =>
  (tryNormalizeGhanaPhone(a) ?? a.trim()) === (tryNormalizeGhanaPhone(b) ?? b.trim());

/**
 * Only what was actually changed, so a class teacher's save never touches names, and an
 * unchanged WhatsApp number keeps its consent.
 */
export function guardianChanges(values: GuardianFormValues, guardian: GuardianDetail): Changes {
  const before = guardianFormValues(guardian);
  const changes: Partial<Record<TextField, string | null>> = {};
  for (const field of Object.keys(before) as (keyof GuardianFormValues)[]) {
    if (field === 'whatsappFollows') continue;
    const value = values[field].trim();
    const unchanged = PHONES.includes(field)
      ? samePhone(value, before[field])
      : value === before[field].trim();
    if (!unchanged) {
      changes[field] = value === '' && OPTIONAL.includes(field) ? null : value;
    }
  }
  const followed = before.whatsappFollows && values.whatsappFollows;
  if (followed && typeof changes.primaryPhone === 'string') {
    changes.whatsappPhone = changes.primaryPhone;
  }
  return changes as Changes;
}
