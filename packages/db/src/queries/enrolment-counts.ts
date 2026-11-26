import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { classes, enrolments, levels, students } from '../schema';
import { onRoll } from './conditions';

const boys = sql<number>`count(${students.id}) filter (where ${students.sex} = 'male')`.mapWith(
  Number,
);
const girls = sql<number>`count(${students.id}) filter (where ${students.sex} = 'female')`.mapWith(
  Number,
);

// Classes with nobody in them still appear (with zeros), so start from classes.
const onClassRoll = and(eq(enrolments.classId, classes.id), onRoll());

/** Query 3a: how many students are in each class this year, boys and girls. */
export async function countEnrolmentsByClass(
  db: Db,
  params: { schoolId: string; academicYearId: string },
) {
  return db
    .select({
      classId: classes.id,
      className: classes.name,
      levelCode: levels.code,
      boys,
      girls,
      total: count(students.id),
    })
    .from(classes)
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .leftJoin(enrolments, onClassRoll)
    .leftJoin(students, and(eq(students.id, enrolments.studentId), isNull(students.archivedAt)))
    .where(
      and(
        eq(classes.schoolId, params.schoolId),
        eq(classes.academicYearId, params.academicYearId),
        isNull(classes.archivedAt),
      ),
    )
    .groupBy(classes.id, classes.name, classes.stream, levels.code, levels.sortOrder)
    .orderBy(asc(levels.sortOrder), asc(classes.stream));
}

/** Query 3b: the same counts rolled up per level. */
export async function countEnrolmentsByLevel(
  db: Db,
  params: { schoolId: string; academicYearId: string },
) {
  return db
    .select({
      levelId: levels.id,
      levelCode: levels.code,
      levelName: levels.name,
      boys,
      girls,
      total: count(students.id),
    })
    .from(classes)
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .leftJoin(enrolments, onClassRoll)
    .leftJoin(students, and(eq(students.id, enrolments.studentId), isNull(students.archivedAt)))
    .where(
      and(
        eq(classes.schoolId, params.schoolId),
        eq(classes.academicYearId, params.academicYearId),
        isNull(classes.archivedAt),
      ),
    )
    .groupBy(levels.id, levels.code, levels.name, levels.sortOrder)
    .orderBy(asc(levels.sortOrder));
}
