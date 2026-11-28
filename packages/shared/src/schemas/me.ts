import { z } from 'zod';
import { staffRoleSchema } from '../enums';
import { photoUrlSchema } from './common';

const classRefSchema = z.object({ id: z.uuid(), name: z.string() });

/** Who is signed in: what the app needs to draw the right home screen and menus. */
export const meSchema = z.object({
  userId: z.uuid(),
  displayName: z.string(),
  roles: z.array(staffRoleSchema),
  school: z.object({ name: z.string(), shortName: z.string() }),
  /** Null for a login with no staff record. */
  staffId: z.uuid().nullable(),
  jobTitle: z.string().nullable(),
  photoUrl: photoUrlSchema,
  academicYearName: z.string().nullable(),
  formClasses: z.array(classRefSchema),
  taughtClasses: z.array(classRefSchema),
});
export type Me = z.infer<typeof meSchema>;

/** This year's classes the caller can see students in. */
export const classListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      studentCount: z.number().int(),
      formTeacherName: z.string().nullable(),
      isMyFormClass: z.boolean(),
    }),
  ),
});
export type ClassListResponse = z.infer<typeof classListResponseSchema>;

/** Real counts for the home screen, limited to what the caller can see. */
export const homeSummarySchema = z.object({
  /** Null when the caller can't see students at all. */
  studentCount: z.number().int().nullable(),
  classCount: z.number().int().nullable(),
  myClasses: z.array(z.object({ id: z.uuid(), name: z.string(), studentCount: z.number().int() })),
});
export type HomeSummary = z.infer<typeof homeSummarySchema>;
