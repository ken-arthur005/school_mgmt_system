import { z } from 'zod';
import {
  enrolmentStatusSchema,
  relationshipSchema,
  religionSchema,
  sexSchema,
  STUDENT_STATUSES,
  studentStatusSchema,
} from '../enums';
import {
  dateOnlySchema,
  optionalTextSchema,
  paginationQuerySchema,
  personNameSchema,
  searchTermSchema,
  timestampSchema,
} from './common';

export const studentListQuerySchema = paginationQuerySchema.extend({
  /** Name (every word must match), admission number, or a guardian's phone in any format. */
  q: searchTermSchema,
  /** Defaults to current students; `any` includes former ones. */
  status: z.enum([...STUDENT_STATUSES, 'any']).default('active'),
  includeArchived: z.stringbool().default(false),
  /** Only students in this class (a class belongs to one academic year). */
  classId: z.uuid().optional(),
});
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;

export const studentSummarySchema = z.object({
  id: z.uuid(),
  admissionNumber: z.string(),
  surname: z.string(),
  firstName: z.string(),
  otherNames: z.string().nullable(),
  sex: sexSchema,
  status: studentStatusSchema,
  /** This year's class, or null when the student isn't enrolled this year. */
  className: z.string().nullable(),
  isBoarder: z.boolean(),
});
export type StudentSummary = z.infer<typeof studentSummarySchema>;

export const studentListResponseSchema = z.object({
  items: z.array(studentSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type StudentListResponse = z.infer<typeof studentListResponseSchema>;

export const studentGuardianLinkSchema = z.object({
  guardianId: z.uuid(),
  surname: z.string(),
  firstName: z.string(),
  otherNames: z.string().nullable(),
  relationship: relationshipSchema,
  isMainContact: z.boolean(),
  primaryPhone: z.string(),
  whatsappPhone: z.string(),
  whatsappOptIn: z.boolean(),
});
export type StudentGuardianLink = z.infer<typeof studentGuardianLinkSchema>;

export const medicalNoteSchema = z.object({
  id: z.uuid(),
  note: z.string(),
  createdAt: timestampSchema,
});
export type MedicalNote = z.infer<typeof medicalNoteSchema>;

export const studentDetailSchema = z.object({
  id: z.uuid(),
  admissionNumber: z.string(),
  surname: z.string(),
  firstName: z.string(),
  otherNames: z.string().nullable(),
  sex: sexSchema,
  dateOfBirth: dateOnlySchema,
  admittedOn: dateOnlySchema,
  status: studentStatusSchema,
  religion: religionSchema.nullable(),
  ghanaCardNumber: z.string().nullable(),
  nhisNumber: z.string().nullable(),
  archivedAt: timestampSchema.nullable(),
  currentEnrolment: z
    .object({
      classId: z.uuid(),
      className: z.string(),
      academicYearName: z.string(),
      status: enrolmentStatusSchema,
      isBoarder: z.boolean(),
    })
    .nullable(),
  /** Left out when the caller may not see guardians. */
  guardians: z.array(studentGuardianLinkSchema).optional(),
  /** Left out when the caller may not see medical notes. */
  medicalNotes: z.array(medicalNoteSchema).optional(),
});
export type StudentDetail = z.infer<typeof studentDetailSchema>;

/**
 * Fields the office can correct. Admission number (server-assigned), status (changes with
 * enrolment), and photo (Sprint 3) are not edited here.
 */
export const studentEditSchema = z
  .strictObject({
    surname: personNameSchema,
    firstName: personNameSchema,
    otherNames: optionalTextSchema(100),
    sex: sexSchema,
    dateOfBirth: dateOnlySchema,
    religion: religionSchema.nullable(),
    ghanaCardNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^GHA-\d{9}-\d$/, 'A Ghana Card number looks like GHA-123456789-0.')
      .nullable(),
    nhisNumber: optionalTextSchema(30),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to change.' });
export type StudentEdit = z.infer<typeof studentEditSchema>;
