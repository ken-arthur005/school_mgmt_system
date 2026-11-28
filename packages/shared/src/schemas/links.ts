import { z } from 'zod';
import { relationshipSchema } from '../enums';
import { ghanaPhoneInputSchema, optionalTextSchema, personNameSchema } from './common';
import { guardianSummarySchema } from './guardians';

const existingGuardianSchema = z.strictObject({
  kind: z.literal('existing'),
  guardianId: z.uuid(),
});

const newGuardianSchema = z.strictObject({
  kind: z.literal('new'),
  /** From the device, so a retried save creates the guardian only once. */
  guardianId: z.uuid(),
  surname: personNameSchema,
  firstName: personNameSchema,
  otherNames: optionalTextSchema(100).optional(),
  primaryPhone: ghanaPhoneInputSchema,
  /** Left out when it is the same as the main phone. */
  whatsappPhone: ghanaPhoneInputSchema.optional(),
  /** Set after the user has seen that this phone number is already on file. */
  confirmNew: z.boolean().default(false),
});

/** Link a guardian (one on file, or a new one) to a student. */
export const guardianLinkCreateSchema = z.strictObject({
  linkId: z.uuid(),
  relationship: relationshipSchema,
  /** A student's first guardian is always the main contact. */
  isMainContact: z.boolean().default(false),
  whatsappOptIn: z.boolean().default(false),
  guardian: z.discriminatedUnion('kind', [existingGuardianSchema, newGuardianSchema]),
});
export type GuardianLinkCreate = z.infer<typeof guardianLinkCreateSchema>;

export const guardianLinkEditSchema = z
  .strictObject({
    relationship: relationshipSchema,
    /** Can only be turned on: the main contact moves by choosing someone else. */
    isMainContact: z.literal(true),
    whatsappOptIn: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to change.' });
export type GuardianLinkEdit = z.infer<typeof guardianLinkEditSchema>;

/** `details` of a 409 `possible_duplicate`: who already has that phone number. */
export const possibleDuplicateSchema = z.object({ matches: z.array(guardianSummarySchema) });
export type PossibleDuplicate = z.infer<typeof possibleDuplicateSchema>;
