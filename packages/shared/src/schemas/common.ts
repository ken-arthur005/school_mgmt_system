import { z } from 'zod';
import { tryNormalizeGhanaPhone } from '../phone';

/** The one error shape the API sends: `{ error: { code, message, details? } }`. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const idParamsSchema = z.object({ id: z.uuid() });
export type IdParams = z.infer<typeof idParamsSchema>;

/** Paging in a query string (values arrive as text). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** Paging in a JSON body. */
export const paginationBodySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

/**
 * What someone typed in a search box. It can be a name or phone number, so it travels in a
 * request body, never in a URL (URLs end up in logs; CLAUDE.md §9).
 */
export const searchTextSchema = z
  .string()
  .trim()
  .min(1, 'Type a name or number to search for.')
  .max(100, 'This is too long.');

/** A required person's name: trimmed, not blank. */
export const personNameSchema = z
  .string()
  .trim()
  .min(1, 'Please fill this in.')
  .max(100, 'This is too long.');

/** An optional text field: blank becomes null, so the value is cleared. */
export const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'This is too long.')
    .transform((value) => (value === '' ? null : value))
    .nullable();

/** Accepts any common Ghana format and outputs E.164 (+233…). */
export const ghanaPhoneInputSchema = z
  .string()
  .refine((value) => tryNormalizeGhanaPhone(value) !== null, {
    message: 'Please enter a valid Ghana phone number, e.g. 024 123 4567.',
  })
  .transform((value) => tryNormalizeGhanaPhone(value) ?? value);

export const timestampSchema = z.iso.datetime();
/** A short-lived link to a private photo, or null when there is none. */
export const photoUrlSchema = z.url().nullable();
export const dateOnlySchema = z.iso.date();
