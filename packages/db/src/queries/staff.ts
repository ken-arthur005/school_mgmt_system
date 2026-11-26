import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { classes, levels, staff, staffAssignments, subjects } from '../schema';

/** Query 7a: each class this year and its form teacher (null if none is set yet). */
export async function listFormTeachers(
  db: Db,
  params: { schoolId: string; academicYearId: string },
) {
  return db
    .select({
      classId: classes.id,
      className: classes.name,
      staffId: staff.id,
      surname: staff.surname,
      firstName: staff.firstName,
    })
    .from(classes)
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .leftJoin(staff, and(eq(staff.id, classes.formTeacherStaffId), isNull(staff.archivedAt)))
    .where(
      and(
        eq(classes.schoolId, params.schoolId),
        eq(classes.academicYearId, params.academicYearId),
        isNull(classes.archivedAt),
      ),
    )
    .orderBy(asc(levels.sortOrder), asc(classes.stream));
}

/** Query 7b: everyone teaching in one class, with their subjects and who the form teacher is. */
export async function listClassTeachers(db: Db, params: { schoolId: string; classId: string }) {
  return db
    .select({
      staffId: staff.id,
      surname: staff.surname,
      firstName: staff.firstName,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      isFormTeacher: sql<boolean>`${classes.formTeacherStaffId} = ${staff.id}`,
    })
    .from(staffAssignments)
    .innerJoin(classes, eq(classes.id, staffAssignments.classId))
    .innerJoin(staff, eq(staff.id, staffAssignments.staffId))
    .innerJoin(subjects, eq(subjects.id, staffAssignments.subjectId))
    .where(
      and(
        eq(staffAssignments.schoolId, params.schoolId),
        eq(staffAssignments.classId, params.classId),
        isNull(staffAssignments.archivedAt),
        isNull(staff.archivedAt),
      ),
    )
    .orderBy(asc(staff.surname), asc(staff.firstName), asc(subjects.name));
}

/** Query 8: the classes and subjects one teacher has this year. */
export async function listTeacherAssignments(
  db: Db,
  params: { schoolId: string; staffId: string; academicYearId: string },
) {
  return db
    .select({
      classId: classes.id,
      className: classes.name,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      isFormTeacher: sql<boolean>`${classes.formTeacherStaffId} = ${params.staffId}`,
    })
    .from(staffAssignments)
    .innerJoin(classes, eq(classes.id, staffAssignments.classId))
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .innerJoin(subjects, eq(subjects.id, staffAssignments.subjectId))
    .where(
      and(
        eq(staffAssignments.schoolId, params.schoolId),
        eq(staffAssignments.staffId, params.staffId),
        eq(classes.academicYearId, params.academicYearId),
        isNull(staffAssignments.archivedAt),
        isNull(classes.archivedAt),
      ),
    )
    .orderBy(asc(levels.sortOrder), asc(classes.stream), asc(subjects.name));
}
