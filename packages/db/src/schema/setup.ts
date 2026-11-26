import { ELECTIVE_GROUPS, LEVEL_STAGES } from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { baseColumns, notArchived, oneOf } from './core';
import { staff } from './people';

export const academicYears = pgTable(
  'academic_years',
  {
    ...baseColumns(),
    // e.g. "2026/2027"
    name: text('name').notNull(),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }).notNull(),
  },
  (t) => [
    uniqueIndex('academic_years_school_name_key')
      .on(t.schoolId, t.name)
      .where(notArchived(t.archivedAt)),
    check('academic_years_dates_in_order', sql`${t.endsOn} > ${t.startsOn}`),
  ],
);

export const terms = pgTable(
  'terms',
  {
    ...baseColumns(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    number: smallint('number').notNull(),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }).notNull(),
    midTermBreakStartsOn: date('mid_term_break_starts_on', { mode: 'string' }),
    midTermBreakEndsOn: date('mid_term_break_ends_on', { mode: 'string' }),
  },
  (t) => [
    uniqueIndex('terms_year_number_key')
      .on(t.academicYearId, t.number)
      .where(notArchived(t.archivedAt)),
    index('terms_school_dates_idx').on(t.schoolId, t.startsOn, t.endsOn),
    check('terms_number_valid', sql`${t.number} BETWEEN 1 AND 3`),
    check('terms_dates_in_order', sql`${t.endsOn} > ${t.startsOn}`),
    check(
      'terms_mid_term_break_valid',
      sql`(${t.midTermBreakStartsOn} IS NULL AND ${t.midTermBreakEndsOn} IS NULL)
        OR (${t.midTermBreakStartsOn} >= ${t.startsOn}
          AND ${t.midTermBreakEndsOn} >= ${t.midTermBreakStartsOn}
          AND ${t.midTermBreakEndsOn} <= ${t.endsOn})`,
    ),
  ],
);

export const levels = pgTable(
  'levels',
  {
    ...baseColumns(),
    // Short stable key, e.g. "KG1", "B4", "JHS2".
    code: text('code').notNull(),
    // Display name, e.g. "KG 1", "Basic 4", "JHS 2".
    name: text('name').notNull(),
    stage: text('stage', { enum: LEVEL_STAGES }).notNull(),
    sortOrder: smallint('sort_order').notNull(),
  },
  (t) => [
    uniqueIndex('levels_school_code_key').on(t.schoolId, t.code).where(notArchived(t.archivedAt)),
    uniqueIndex('levels_school_sort_order_key')
      .on(t.schoolId, t.sortOrder)
      .where(notArchived(t.archivedAt)),
    check('levels_stage_valid', oneOf(t.stage, LEVEL_STAGES)),
  ],
);

/** A class is one stream of one level in one academic year, so history survives promotion. */
export const classes = pgTable(
  'classes',
  {
    ...baseColumns(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    levelId: uuid('level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'restrict' }),
    // "A", "B"… or NULL for a level with a single class (Creche, JHS).
    stream: text('stream'),
    // e.g. "Basic 4A", "JHS 2"
    name: text('name').notNull(),
    // The teacher in charge of the class's affairs. One teacher may be form teacher of several classes.
    formTeacherStaffId: uuid('form_teacher_staff_id').references(() => staff.id, {
      onDelete: 'restrict',
    }),
  },
  (t) => [
    unique('classes_year_level_stream_key')
      .on(t.academicYearId, t.levelId, t.stream)
      .nullsNotDistinct(),
    unique('classes_year_name_key').on(t.academicYearId, t.name),
    // Target for enrolments' (class_id, academic_year_id) foreign key.
    unique('classes_id_year_key').on(t.id, t.academicYearId),
    index('classes_level_id_idx').on(t.levelId),
    index('classes_form_teacher_staff_id_idx').on(t.formTeacherStaffId),
    check('classes_stream_format', sql`${t.stream} ~ '^[A-Z]$'`),
  ],
);

export const subjects = pgTable(
  'subjects',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    // Subjects in the same group are alternatives: a student takes one (e.g. Twi or Dagaare).
    electiveGroup: text('elective_group', { enum: ELECTIVE_GROUPS }),
  },
  (t) => [
    uniqueIndex('subjects_school_code_key').on(t.schoolId, t.code).where(notArchived(t.archivedAt)),
    uniqueIndex('subjects_school_name_key').on(t.schoolId, t.name).where(notArchived(t.archivedAt)),
    check('subjects_elective_group_valid', oneOf(t.electiveGroup, ELECTIVE_GROUPS)),
  ],
);

export const classSubjects = pgTable(
  'class_subjects',
  {
    ...baseColumns(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
  },
  (t) => [
    // A full (not partial) constraint so staff_assignments can reference it.
    unique('class_subjects_class_subject_key').on(t.classId, t.subjectId),
    index('class_subjects_subject_id_idx').on(t.subjectId),
  ],
);
