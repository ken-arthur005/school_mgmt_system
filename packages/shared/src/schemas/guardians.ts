import { z } from 'zod';
import { relationshipSchema, studentStatusSchema } from '../enums';
import {
  ghanaPhoneInputSchema,
  optionalTextSchema,
  paginationBodySchema,
  paginationQuerySchema,
  personNameSchema,
  searchTextSchema,
} from './common';

/** `GET /guardians`: paging only. */
export const guardianListQuerySchema = paginationQuerySchema;
export type GuardianListQuery = z.infer<typeof guardianListQuerySchema>;

/** `POST /guardians/search`: the search text travels in the body, never in the URL. */
export const guardianSearchSchema = paginationBodySchema.extend({
  /** Name (every word must match) or phone number in any format. */
  q: searchTextSchema,
});
export type GuardianSearch = z.infer<typeof guardianSearchSchema>;

export const guardianSummarySchema = z.object({
  id: z.uuid(),
  surname: z.string(),
  firstName: z.string(),
  otherNames: z.string().nullable(),
  primaryPhone: z.string(),
  whatsappPhone: z.string(),
});
export type GuardianSummary = z.infer<typeof guardianSummarySchema>;

export const guardianListResponseSchema = z.object({
  items: z.array(guardianSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type GuardianListResponse = z.infer<typeof guardianListResponseSchema>;

export const guardianDetailSchema = guardianSummarySchema.extend({
  secondaryPhone: z.string().nullable(),
  email: z.string().nullable(),
  occupation: z.string().nullable(),
  address: z.string().nullable(),
  digitalAddress: z.string().nullable(),
  /** Only the children the caller is allowed to see. */
  children: z.array(
    z.object({
      studentId: z.uuid(),
      admissionNumber: z.string(),
      surname: z.string(),
      firstName: z.string(),
      status: studentStatusSchema,
      relationship: relationshipSchema,
      isMainContact: z.boolean(),
      whatsappOptIn: z.boolean(),
    }),
  ),
});
export type GuardianDetail = z.infer<typeof guardianDetailSchema>;

/** Fields a class teacher may change (permission `guardians.edit_contact`). */
export const GUARDIAN_CONTACT_FIELDS = [
  'primaryPhone',
  'secondaryPhone',
  'whatsappPhone',
  'email',
  'occupation',
  'address',
  'digitalAddress',
] as const;

/** Names need `guardians.edit`. Links to students (relationship, main contact) come in Sprint 3. */
export const guardianEditSchema = z
  .strictObject({
    surname: personNameSchema,
    firstName: personNameSchema,
    otherNames: optionalTextSchema(100),
    primaryPhone: ghanaPhoneInputSchema,
    secondaryPhone: ghanaPhoneInputSchema.nullable(),
    whatsappPhone: ghanaPhoneInputSchema,
    email: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .pipe(z.email('Please enter a valid email address.').nullable())
      .nullable(),
    occupation: optionalTextSchema(100),
    address: optionalTextSchema(300),
    digitalAddress: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, 'A GhanaPost GPS address looks like GA-183-8164.')
      .nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to change.' });
export type GuardianEdit = z.infer<typeof guardianEditSchema>;
