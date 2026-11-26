import { ENROLMENT_STATUSES } from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { baseColumns, notArchived, oneOf } from './core';
import { students } from './people';
import { academicYears, classes, subjects } from './setup';

/** A student's place in one class for one academic year. Promotion adds a row; it never edits one. */
export const enrolments = pgTable(
  'enrolments',
  {
    ...baseColumns(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    classId: uuid('class_id').notNull(),
    // Repeated from the class so "one enrolment per student per year" can be a constraint.
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    enrolledOn: date('enrolled_on', { mode: 'string' }).notNull(),
    leftOn: date('left_on', { mode: 'string' }),
    status: text('status', { enum: ENROLMENT_STATUSES }).notNull().default('active'),
    isBoarder: boolean('is_boarder').notNull().default(false),
    // The student's choice of Ghanaian language this year (Twi or Dagaare), from Basic 1.
    ghanaianLanguageSubjectId: uuid('ghanaian_language_subject_id').references(() => subjects.id, {
      onDelete: 'restrict',
    }),
  },
  (t) => [
    // Also guarantees the class belongs to the same academic year as the enrolment.
    foreignKey({
      name: 'enrolments_class_year_fk',
      columns: [t.classId, t.academicYearId],
      foreignColumns: [classes.id, classes.academicYearId],
    }).onDelete('restrict'),
    uniqueIndex('enrolments_student_year_key')
      .on(t.studentId, t.academicYearId)
      .where(notArchived(t.archivedAt)),
    index('enrolments_class_id_idx').on(t.classId),
    index('enrolments_school_year_idx').on(t.schoolId, t.academicYearId),
    index('enrolments_ghanaian_language_subject_id_idx').on(t.ghanaianLanguageSubjectId),
    check('enrolments_status_valid', oneOf(t.status, ENROLMENT_STATUSES)),
    check('enrolments_left_after_enrolled', sql`${t.leftOn} >= ${t.enrolledOn}`),
  ],
);
