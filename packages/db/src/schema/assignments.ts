import { foreignKey, index, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { baseColumns, notArchived } from './core';
import { staff } from './people';
import { classes, classSubjects, subjects } from './setup';

/**
 * Who teaches what: one row per (teacher, class, subject). A class teacher who teaches every
 * subject has a row per subject. The form teacher is recorded on `classes`, not here.
 */
export const staffAssignments = pgTable(
  'staff_assignments',
  {
    ...baseColumns(),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
  },
  (t) => [
    // A teacher can only be given a subject the class actually takes.
    foreignKey({
      name: 'staff_assignments_class_subject_fk',
      columns: [t.classId, t.subjectId],
      foreignColumns: [classSubjects.classId, classSubjects.subjectId],
    }).onDelete('restrict'),
    uniqueIndex('staff_assignments_staff_class_subject_key')
      .on(t.staffId, t.classId, t.subjectId)
      .where(notArchived(t.archivedAt)),
    index('staff_assignments_class_id_idx').on(t.classId),
    index('staff_assignments_subject_id_idx').on(t.subjectId),
  ],
);
