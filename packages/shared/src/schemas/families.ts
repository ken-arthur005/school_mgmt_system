import { z } from 'zod';
import { relationshipSchema, studentStatusSchema } from '../enums';
import {
  paginationBodySchema,
  paginationQuerySchema,
  personNameSchema,
  photoUrlSchema,
  searchTextSchema,
} from './common';

/** `GET /families`: paging only. */
export const familyListQuerySchema = paginationQuerySchema;
export type FamilyListQuery = z.infer<typeof familyListQuerySchema>;

/** `POST /families/search`: a family name or a child's name, in the body. */
export const familySearchSchema = paginationBodySchema.extend({ q: searchTextSchema });
export type FamilySearch = z.infer<typeof familySearchSchema>;

const familyChildSchema = z.object({
  studentId: z.uuid(),
  admissionNumber: z.string(),
  surname: z.string(),
  firstName: z.string(),
  status: studentStatusSchema,
  className: z.string().nullable(),
  photoUrl: photoUrlSchema,
});
export type FamilyChild = z.infer<typeof familyChildSchema>;

export const familySummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  children: z.array(familyChildSchema),
});
export type FamilySummary = z.infer<typeof familySummarySchema>;

export const familyListResponseSchema = z.object({
  items: z.array(familySummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type FamilyListResponse = z.infer<typeof familyListResponseSchema>;

export const familyDetailSchema = familySummarySchema.extend({
  /** Everyone looking after any child of this family, and which of them. */
  guardians: z.array(
    z.object({
      guardianId: z.uuid(),
      surname: z.string(),
      firstName: z.string(),
      primaryPhone: z.string(),
      photoUrl: photoUrlSchema,
      children: z.array(
        z.object({
          studentId: z.uuid(),
          firstName: z.string(),
          relationship: relationshipSchema,
          isMainContact: z.boolean(),
        }),
      ),
    }),
  ),
});
export type FamilyDetail = z.infer<typeof familyDetailSchema>;

export const familyRenameSchema = z.strictObject({ name: personNameSchema });
export type FamilyRename = z.infer<typeof familyRenameSchema>;

/** Add a child to a family. `move` confirms taking them out of the family they are in. */
export const familyAddChildSchema = z.strictObject({
  studentId: z.uuid(),
  move: z.boolean().default(false),
});
export type FamilyAddChild = z.infer<typeof familyAddChildSchema>;

/** "Add a brother or sister" on a student's profile. */
export const siblingAddSchema = z.strictObject({
  siblingId: z.uuid(),
  /** Used only if neither child has a family yet; from the device, so a retry is harmless. */
  newFamilyId: z.uuid(),
  move: z.boolean().default(false),
  /** Also give the brother or sister this student's guardians. */
  linkGuardians: z.boolean().default(false),
});
export type SiblingAdd = z.infer<typeof siblingAddSchema>;

export const familyCreateSchema = z.strictObject({
  id: z.uuid(),
  /** Left out for the usual "<surname> family". */
  name: personNameSchema.optional(),
  studentIds: z.array(z.uuid()).min(1, 'Choose at least one child.').max(20),
  move: z.boolean().default(false),
});
export type FamilyCreate = z.infer<typeof familyCreateSchema>;
