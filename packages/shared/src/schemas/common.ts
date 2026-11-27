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

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** Free-text search box. Blank means "no search". */
export const searchTermSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value === '' ? undefined : value))
  .optional();

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
export const dateOnlySchema = z.iso.date();
