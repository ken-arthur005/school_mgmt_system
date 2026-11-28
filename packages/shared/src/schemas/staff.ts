import { z } from 'zod';
import { employmentTypeSchema } from '../enums';
import { photoUrlSchema } from './common';

export const staffSummarySchema = z.object({
  id: z.uuid(),
  surname: z.string(),
  firstName: z.string(),
  jobTitle: z.string(),
  photoUrl: photoUrlSchema,
});
export type StaffSummary = z.infer<typeof staffSummarySchema>;

/** A school has few staff (54), so the list comes in one piece. */
export const staffListResponseSchema = z.object({ items: z.array(staffSummarySchema) });
export type StaffListResponse = z.infer<typeof staffListResponseSchema>;

export const staffDetailSchema = staffSummarySchema.extend({
  otherNames: z.string().nullable(),
  employmentType: employmentTypeSchema,
  phone: z.string().nullable(),
  email: z.string().nullable(),
});
export type StaffDetail = z.infer<typeof staffDetailSchema>;
