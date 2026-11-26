import { z } from 'zod';

// Each list is exported as a tuple too, so the database schema (packages/db) builds its CHECK
// constraints from the same values. Change a list here and generate a migration.

/** Roles a staff login can hold. Guardians don't log in to the staff app, so they aren't here. */
export const STAFF_ROLES = [
  'owner',
  'head',
  'admin',
  'bursar',
  'class_teacher',
  'subject_teacher',
  'housemaster',
  'system_admin',
] as const;
export const staffRoleSchema = z.enum(STAFF_ROLES);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const SEXES = ['male', 'female'] as const;
export const sexSchema = z.enum(SEXES);
export type Sex = z.infer<typeof sexSchema>;

export const STUDENT_STATUSES = ['active', 'withdrawn', 'graduated', 'transferred'] as const;
export const studentStatusSchema = z.enum(STUDENT_STATUSES);
export type StudentStatus = z.infer<typeof studentStatusSchema>;

/** One student's place in one class for one academic year. */
export const ENROLMENT_STATUSES = [
  'active',
  'completed',
  'withdrawn',
  'transferred',
  'graduated',
] as const;
export const enrolmentStatusSchema = z.enum(ENROLMENT_STATUSES);
export type EnrolmentStatus = z.infer<typeof enrolmentStatusSchema>;

export const RELIGIONS = [
  'christian',
  'muslim',
  'traditional',
  'other',
  'prefer_not_to_say',
] as const;
export const religionSchema = z.enum(RELIGIONS);
export type Religion = z.infer<typeof religionSchema>;

/** How a guardian is related to a student. */
export const RELATIONSHIPS = [
  'mother',
  'father',
  'grandmother',
  'grandfather',
  'aunt',
  'uncle',
  'sibling',
  'guardian',
  'other',
] as const;
export const relationshipSchema = z.enum(RELATIONSHIPS);
export type Relationship = z.infer<typeof relationshipSchema>;

export const EMPLOYMENT_TYPES = ['full_time', 'part_time'] as const;
export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const LEVEL_STAGES = ['creche', 'nursery', 'kindergarten', 'primary', 'jhs'] as const;
export const levelStageSchema = z.enum(LEVEL_STAGES);
export type LevelStage = z.infer<typeof levelStageSchema>;

/** Groups subjects a student chooses one of, e.g. Twi or Dagaare. */
export const ELECTIVE_GROUPS = ['ghanaian_language'] as const;
export const electiveGroupSchema = z.enum(ELECTIVE_GROUPS);
export type ElectiveGroup = z.infer<typeof electiveGroupSchema>;

export const AUDIT_OPERATIONS = ['INSERT', 'UPDATE', 'DELETE'] as const;
export const auditOperationSchema = z.enum(AUDIT_OPERATIONS);
export type AuditOperation = z.infer<typeof auditOperationSchema>;
