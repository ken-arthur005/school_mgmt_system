import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  ne,
  notExists,
  sql,
} from 'drizzle-orm';
import type { Db } from '../client';
import { guardians, studentGuardians, students } from '../schema';

/** Query 4: a student's brothers and sisters, meaning anyone sharing at least one guardian. */
export async function findSiblings(db: Db, params: { schoolId: string; studentId: string }) {
  const theirGuardians = db
    .select({ guardianId: studentGuardians.guardianId })
    .from(studentGuardians)
    .where(
      and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.studentId, params.studentId),
        isNull(studentGuardians.archivedAt),
      ),
    );

  return db
    .selectDistinct({
      studentId: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
      status: students.status,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .where(
      and(
        eq(students.schoolId, params.schoolId),
        inArray(studentGuardians.guardianId, theirGuardians),
        ne(studentGuardians.studentId, params.studentId),
        isNull(studentGuardians.archivedAt),
        isNull(students.archivedAt),
      ),
    )
    .orderBy(asc(students.firstName), asc(students.surname), asc(students.id));
}

/** Query 5: guardians with at least `minChildren` children currently at the school. */
export async function listGuardiansWithManyChildren(
  db: Db,
  params: { schoolId: string; minChildren: number },
) {
  const childCount = countDistinct(students.id);
  return db
    .select({
      guardianId: guardians.id,
      surname: guardians.surname,
      firstName: guardians.firstName,
      primaryPhone: guardians.primaryPhone,
      childCount,
    })
    .from(guardians)
    .innerJoin(
      studentGuardians,
      and(eq(studentGuardians.guardianId, guardians.id), isNull(studentGuardians.archivedAt)),
    )
    .innerJoin(
      students,
      and(
        eq(students.id, studentGuardians.studentId),
        eq(students.status, 'active'),
        isNull(students.archivedAt),
      ),
    )
    .where(and(eq(guardians.schoolId, params.schoolId), isNull(guardians.archivedAt)))
    .groupBy(guardians.id, guardians.surname, guardians.firstName, guardians.primaryPhone)
    .having(gte(childCount, params.minChildren))
    .orderBy(desc(childCount), asc(guardians.surname), asc(guardians.firstName));
}

/**
 * Query 6 (data quality): current students with no main contact, including students with no
 * guardian at all. Every one of these needs fixing before the school can message parents.
 */
export async function listStudentsWithoutMainContact(db: Db, params: { schoolId: string }) {
  const mainContact = db
    .select({ one: sql`1` })
    .from(studentGuardians)
    .innerJoin(
      guardians,
      and(eq(guardians.id, studentGuardians.guardianId), isNull(guardians.archivedAt)),
    )
    .where(
      and(
        eq(studentGuardians.studentId, students.id),
        eq(studentGuardians.isMainContact, true),
        isNull(studentGuardians.archivedAt),
      ),
    );

  return db
    .select({
      studentId: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
    })
    .from(students)
    .where(
      and(
        eq(students.schoolId, params.schoolId),
        eq(students.status, 'active'),
        isNull(students.archivedAt),
        notExists(mainContact),
      ),
    )
    .orderBy(asc(students.surname), asc(students.firstName));
}
