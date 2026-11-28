import {
  EMPLOYMENT_TYPES,
  RELATIONSHIPS,
  RELIGIONS,
  SEXES,
  STAFF_ROLES,
  STUDENT_STATUSES,
} from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { baseColumns, ghanaPhone, notArchived, oneOf, users } from './core';

/**
 * Which children belong together (brothers and sisters). Separate from guardianship: a guardian may
 * look after a child of another family without making the children siblings.
 */
export const families = pgTable(
  'families',
  {
    ...baseColumns(),
    name: text('name').notNull(),
  },
  (t) => [
    index('families_school_name_idx').on(t.schoolId, t.name),
    check('families_name_not_blank', sql`btrim(${t.name}) <> ''`),
  ],
);

export const students = pgTable(
  'students',
  {
    ...baseColumns(),
    // Server-assigned; the school's real format is still to be decided.
    admissionNumber: text('admission_number').notNull(),
    surname: text('surname').notNull(),
    firstName: text('first_name').notNull(),
    otherNames: text('other_names'),
    sex: text('sex', { enum: SEXES }).notNull(),
    dateOfBirth: date('date_of_birth', { mode: 'string' }).notNull(),
    admittedOn: date('admitted_on', { mode: 'string' }).notNull(),
    status: text('status', { enum: STUDENT_STATUSES }).notNull().default('active'),
    photoPath: text('photo_path'),
    ghanaCardNumber: text('ghana_card_number'),
    nhisNumber: text('nhis_number'),
    religion: text('religion', { enum: RELIGIONS }),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'restrict' }),
  },
  (t) => [
    index('students_family_id_idx').on(t.familyId),
    uniqueIndex('students_admission_number_key')
      .on(t.schoolId, t.admissionNumber)
      .where(notArchived(t.archivedAt)),
    index('students_school_name_idx').on(t.schoolId, t.surname, t.firstName),
    check('students_sex_valid', oneOf(t.sex, SEXES)),
    check('students_status_valid', oneOf(t.status, STUDENT_STATUSES)),
    check('students_religion_valid', oneOf(t.religion, RELIGIONS)),
    check(
      'students_names_not_blank',
      sql`btrim(${t.surname}) <> '' AND btrim(${t.firstName}) <> ''`,
    ),
    check('students_born_before_admitted', sql`${t.dateOfBirth} < ${t.admittedOn}`),
    check('students_ghana_card_format', sql`${t.ghanaCardNumber} ~ '^GHA-[0-9]{9}-[0-9]$'`),
  ],
);

/** Kept apart from `students` because only a few roles may see medical information. */
export const studentMedicalNotes = pgTable(
  'student_medical_notes',
  {
    ...baseColumns(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    note: text('note').notNull(),
  },
  (t) => [
    index('student_medical_notes_student_id_idx').on(t.studentId),
    check('student_medical_notes_not_blank', sql`btrim(${t.note}) <> ''`),
  ],
);

export const guardians = pgTable(
  'guardians',
  {
    ...baseColumns(),
    surname: text('surname').notNull(),
    firstName: text('first_name').notNull(),
    otherNames: text('other_names'),
    primaryPhone: text('primary_phone').notNull(),
    secondaryPhone: text('secondary_phone'),
    // Usually the same as primary_phone; set by the API when the form leaves it blank.
    whatsappPhone: text('whatsapp_phone').notNull(),
    email: text('email'),
    occupation: text('occupation'),
    address: text('address'),
    // GhanaPost GPS, e.g. GA-183-8164.
    digitalAddress: text('digital_address'),
    // Set when the guardian is also a staff member with a login.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
    photoPath: text('photo_path'),
  },
  (t) => [
    index('guardians_school_primary_phone_idx').on(t.schoolId, t.primaryPhone),
    index('guardians_school_whatsapp_phone_idx').on(t.schoolId, t.whatsappPhone),
    index('guardians_school_name_idx').on(t.schoolId, t.surname, t.firstName),
    uniqueIndex('guardians_user_id_key').on(t.userId).where(notArchived(t.archivedAt)),
    check(
      'guardians_names_not_blank',
      sql`btrim(${t.surname}) <> '' AND btrim(${t.firstName}) <> ''`,
    ),
    check('guardians_primary_phone_format', ghanaPhone(t.primaryPhone)),
    check('guardians_secondary_phone_format', ghanaPhone(t.secondaryPhone)),
    check('guardians_whatsapp_phone_format', ghanaPhone(t.whatsappPhone)),
    check('guardians_email_format', sql`${t.email} ~ '^[^@[:space:]]+@[^@[:space:]]+$'`),
    check(
      'guardians_digital_address_format',
      sql`${t.digitalAddress} ~ '^[A-Z]{2}-[0-9]{3,4}-[0-9]{4}$'`,
    ),
  ],
);

export const studentGuardians = pgTable(
  'student_guardians',
  {
    ...baseColumns(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'restrict' }),
    relationship: text('relationship', { enum: RELATIONSHIPS }).notNull(),
    isMainContact: boolean('is_main_contact').notNull().default(false),
    whatsappOptIn: boolean('whatsapp_opt_in').notNull().default(false),
    // When consent was recorded (Act 843).
    whatsappOptInAt: timestamp('whatsapp_opt_in_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('student_guardians_student_guardian_key')
      .on(t.studentId, t.guardianId)
      .where(notArchived(t.archivedAt)),
    uniqueIndex('student_guardians_one_main_contact')
      .on(t.studentId)
      .where(sql`${t.isMainContact} AND ${t.archivedAt} IS NULL`),
    index('student_guardians_guardian_id_idx').on(t.guardianId),
    check('student_guardians_relationship_valid', oneOf(t.relationship, RELATIONSHIPS)),
    check(
      'student_guardians_opt_in_has_date',
      sql`NOT ${t.whatsappOptIn} OR ${t.whatsappOptInAt} IS NOT NULL`,
    ),
  ],
);

/** The HR record. Not every staff member has a login (`user_id`). */
export const staff = pgTable(
  'staff',
  {
    ...baseColumns(),
    surname: text('surname').notNull(),
    firstName: text('first_name').notNull(),
    otherNames: text('other_names'),
    jobTitle: text('job_title').notNull(),
    employmentType: text('employment_type', { enum: EMPLOYMENT_TYPES }).notNull(),
    phone: text('phone'),
    email: text('email'),
    startedOn: date('started_on', { mode: 'string' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
    photoPath: text('photo_path'),
  },
  (t) => [
    uniqueIndex('staff_user_id_key').on(t.userId).where(notArchived(t.archivedAt)),
    index('staff_school_name_idx').on(t.schoolId, t.surname, t.firstName),
    check('staff_names_not_blank', sql`btrim(${t.surname}) <> '' AND btrim(${t.firstName}) <> ''`),
    check('staff_employment_type_valid', oneOf(t.employmentType, EMPLOYMENT_TYPES)),
    check('staff_phone_format', ghanaPhone(t.phone)),
    check('staff_email_format', sql`${t.email} ~ '^[^@[:space:]]+@[^@[:space:]]+$'`),
  ],
);

export const userRoles = pgTable(
  'user_roles',
  {
    ...baseColumns(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: text('role', { enum: STAFF_ROLES }).notNull(),
  },
  (t) => [
    uniqueIndex('user_roles_user_role_key').on(t.userId, t.role).where(notArchived(t.archivedAt)),
    check('user_roles_role_valid', oneOf(t.role, STAFF_ROLES)),
  ],
);
