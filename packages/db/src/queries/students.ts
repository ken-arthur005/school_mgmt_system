import { and, asc, eq, exists, ilike, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { classes, enrolments, guardians, levels, studentGuardians, students } from '../schema';
import { onRoll } from './conditions';

/** Query 1: every student in a level this year, with their main guardian's name and phone. */
export async function listLevelStudentsWithMainGuardian(
  db: Db,
  params: { schoolId: string; academicYearId: string; levelCode: string },
) {
  return db
    .select({
      studentId: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
      className: classes.name,
      // Null when nobody is marked as the main contact (see listStudentsWithoutMainContact).
      guardianId: guardians.id,
      guardianSurname: guardians.surname,
      guardianFirstName: guardians.firstName,
      guardianPhone: guardians.primaryPhone,
    })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .innerJoin(levels, eq(levels.id, classes.levelId))
    .leftJoin(
      studentGuardians,
      and(
        eq(studentGuardians.studentId, students.id),
        eq(studentGuardians.isMainContact, true),
        isNull(studentGuardians.archivedAt),
      ),
    )
    .leftJoin(
      guardians,
      and(eq(guardians.id, studentGuardians.guardianId), isNull(guardians.archivedAt)),
    )
    .where(
      and(
        eq(enrolments.schoolId, params.schoolId),
        eq(enrolments.academicYearId, params.academicYearId),
        onRoll(),
        isNull(students.archivedAt),
        eq(levels.code, params.levelCode),
      ),
    )
    .orderBy(asc(classes.name), asc(students.surname), asc(students.firstName));
}

/** Query 2: a class list, sorted by surname then first name. */
export async function getClassList(db: Db, params: { schoolId: string; classId: string }) {
  return db
    .select({
      studentId: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
      otherNames: students.otherNames,
      sex: students.sex,
      isBoarder: enrolments.isBoarder,
    })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .where(
      and(
        eq(enrolments.schoolId, params.schoolId),
        eq(enrolments.classId, params.classId),
        onRoll(),
        isNull(students.archivedAt),
      ),
    )
    .orderBy(asc(students.surname), asc(students.firstName), asc(students.otherNames));
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Query 9: find students by name (every word must match part of the name), admission number,
 * or a guardian's phone number. Phone numbers must already be in E.164 form (+233…);
 * turning "024 123 4567" into that is normalizeGhanaPhone's job (Sprint 3).
 */
export async function searchStudents(
  db: Db,
  params: { schoolId: string; term: string; limit?: number },
) {
  const term = params.term.trim();
  if (term === '') {
    return [];
  }

  const fullName = sql`concat_ws(' ', ${students.firstName}, ${students.otherNames}, ${students.surname})`;
  const nameMatches: SQL[] = term
    .split(/\s+/)
    .map((word) => ilike(fullName, `%${escapeLike(word)}%`));
  const guardianPhoneMatches = exists(
    db
      .select({ one: sql`1` })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(
        and(
          eq(studentGuardians.studentId, students.id),
          isNull(studentGuardians.archivedAt),
          isNull(guardians.archivedAt),
          or(
            eq(guardians.primaryPhone, term),
            eq(guardians.whatsappPhone, term),
            eq(guardians.secondaryPhone, term),
          ),
        ),
      ),
  );

  return (
    db
      .select({
        studentId: students.id,
        admissionNumber: students.admissionNumber,
        surname: students.surname,
        firstName: students.firstName,
        otherNames: students.otherNames,
        status: students.status,
      })
      .from(students)
      .where(
        and(
          eq(students.schoolId, params.schoolId),
          isNull(students.archivedAt),
          or(
            and(...nameMatches),
            ilike(students.admissionNumber, escapeLike(term)),
            guardianPhoneMatches,
          ),
        ),
      )
      // Current students before former ones.
      .orderBy(sql`${students.status} <> 'active'`, asc(students.surname), asc(students.firstName))
      .limit(params.limit ?? 20)
  );
}
