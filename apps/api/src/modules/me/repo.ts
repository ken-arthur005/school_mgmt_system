import { type Db, schema } from '@school-mgmt/db';
import { and, asc, count, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm';
import type { StudentReach } from '../../access';
import { studentInReach } from '../students/repo';

const { academicYears, classes, enrolments, levels, schools, staff, students, users } = schema;

export async function findProfile(db: Db, params: { schoolId: string; userId: string }) {
  const [row] = await db
    .select({
      displayName: users.displayName,
      schoolName: schools.name,
      schoolShortName: schools.shortName,
      jobTitle: staff.jobTitle,
      photoPath: staff.photoPath,
    })
    .from(users)
    .innerJoin(schools, eq(schools.id, users.schoolId))
    .leftJoin(staff, and(eq(staff.userId, users.id), isNull(staff.archivedAt)))
    .where(and(eq(users.schoolId, params.schoolId), eq(users.id, params.userId)));
  return row ?? null;
}

export async function findAcademicYearName(db: Db, academicYearId: string | null) {
  if (academicYearId === null) return null;
  const [row] = await db
    .select({ name: academicYears.name })
    .from(academicYears)
    .where(eq(academicYears.id, academicYearId));
  return row?.name ?? null;
}

export async function listClassNames(db: Db, params: { schoolId: string; ids: string[] }) {
  if (params.ids.length === 0) return [];
  return db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .where(and(eq(classes.schoolId, params.schoolId), inArray(classes.id, params.ids)))
    .orderBy(asc(levels.sortOrder), asc(classes.stream));
}

/** A current student, with an active place in the class, that the caller may see. */
function countedStudent(reach: StudentReach): SQL | undefined {
  return and(
    eq(students.id, enrolments.studentId),
    eq(students.status, 'active'),
    isNull(students.archivedAt),
    studentInReach(reach, students.id),
  );
}

/**
 * This year's classes with how many students the caller can see in each. With limited reach, only
 * the caller's classes and classes where they can see at least one student (a housemaster's
 * boarders).
 */
export async function listVisibleClasses(
  db: Db,
  params: { schoolId: string; academicYearId: string; reach: StudentReach },
) {
  const { reach } = params;
  const studentCount = count(students.id);
  const own =
    reach.kind === 'limited' && reach.classIds.length > 0
      ? inArray(classes.id, reach.classIds)
      : sql`false`;
  return db
    .select({
      id: classes.id,
      name: classes.name,
      formTeacherStaffId: classes.formTeacherStaffId,
      formTeacherName: sql<
        string | null
      >`nullif(concat_ws(' ', ${staff.firstName}, ${staff.surname}), '')`,
      studentCount,
    })
    .from(classes)
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .leftJoin(staff, eq(staff.id, classes.formTeacherStaffId))
    .leftJoin(
      enrolments,
      and(
        eq(enrolments.classId, classes.id),
        eq(enrolments.status, 'active'),
        isNull(enrolments.archivedAt),
      ),
    )
    .leftJoin(students, countedStudent(reach))
    .where(
      and(
        eq(classes.schoolId, params.schoolId),
        eq(classes.academicYearId, params.academicYearId),
        isNull(classes.archivedAt),
      ),
    )
    .groupBy(classes.id, levels.sortOrder, staff.id)
    .having(reach.kind === 'all' ? undefined : sql`${studentCount} > 0 or ${own}`)
    .orderBy(asc(levels.sortOrder), asc(classes.stream));
}
