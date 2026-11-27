import { type Db, schema, type Tx } from '@school-mgmt/db';
import type { StudentEdit, StudentListQuery } from '@school-mgmt/shared';
import { and, asc, count, eq, exists, ilike, inArray, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { StudentReach } from '../../access';

const { classes, enrolments, guardians, studentGuardians, studentMedicalNotes, students } = schema;
const { academicYears } = schema;

/** Escapes LIKE wildcards so a search for "50%" means the characters, not "anything". */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Every word must appear somewhere in the full name. */
export function nameMatches(words: string, ...nameColumns: SQL[]): SQL | undefined {
  const fullName = sql`concat_ws(' ', ${sql.join(nameColumns, sql`, `)})`;
  return and(
    ...words
      .split(/\s+/)
      .filter((word) => word !== '')
      .map((word) => ilike(fullName, `%${escapeLike(word)}%`)),
  );
}

/**
 * SQL condition: the student (`students.id`) is within reach. For limited reach, that means an
 * active enrolment this year in one of the classes, or boarding this year.
 */
export function studentInReach(reach: StudentReach, studentId: SQL | typeof students.id): SQL {
  if (reach.kind === 'all') {
    return sql`true`;
  }
  if (reach.academicYearId === null || (reach.classIds.length === 0 && !reach.boarders)) {
    return sql`false`;
  }
  const which: SQL[] = [];
  if (reach.classIds.length > 0) {
    which.push(inArray(enrolments.classId, reach.classIds));
  }
  if (reach.boarders) {
    which.push(eq(enrolments.isBoarder, true));
  }
  return exists(
    sql`(select 1 from ${enrolments} where ${and(
      sql`${enrolments.studentId} = ${studentId}`,
      eq(enrolments.academicYearId, reach.academicYearId),
      eq(enrolments.status, 'active'),
      isNull(enrolments.archivedAt),
      or(...which),
    )})`,
  );
}

/** Joins each student's enrolment for the given year (at most one: a DB constraint). */
function thisYearsEnrolment(academicYearId: string | null): SQL {
  return academicYearId === null
    ? sql`false`
    : sql`${and(
        eq(enrolments.studentId, students.id),
        eq(enrolments.academicYearId, academicYearId),
        isNull(enrolments.archivedAt),
      )}`;
}

function searchCondition(term: string, phone: string | null): SQL | undefined {
  if (phone !== null) {
    return exists(
      sql`(select 1 from ${studentGuardians} inner join ${guardians} on ${eq(
        guardians.id,
        studentGuardians.guardianId,
      )} where ${and(
        eq(studentGuardians.studentId, students.id),
        isNull(studentGuardians.archivedAt),
        isNull(guardians.archivedAt),
        or(
          eq(guardians.primaryPhone, phone),
          eq(guardians.whatsappPhone, phone),
          eq(guardians.secondaryPhone, phone),
        ),
      )})`,
    );
  }
  return or(
    nameMatches(term, sql`${students.firstName}`, sql`${students.otherNames}`, sql`${students.surname}`),
    ilike(students.admissionNumber, escapeLike(term)),
  );
}

export async function listStudents(
  db: Db,
  params: {
    schoolId: string;
    academicYearId: string | null;
    reach: StudentReach;
    query: StudentListQuery;
    /** The search term as E.164 when it is a phone number. */
    phone: string | null;
  },
) {
  const { query } = params;
  const where = and(
    eq(students.schoolId, params.schoolId),
    query.includeArchived ? undefined : isNull(students.archivedAt),
    query.status === 'any' ? undefined : eq(students.status, query.status),
    query.classId === undefined
      ? undefined
      : exists(
          sql`(select 1 from ${enrolments} where ${and(
            eq(enrolments.studentId, students.id),
            eq(enrolments.classId, query.classId),
            isNull(enrolments.archivedAt),
          )})`,
        ),
    query.q === undefined ? undefined : searchCondition(query.q, params.phone),
    studentInReach(params.reach, students.id),
  );

  const [totalRow] = await db.select({ total: count() }).from(students).where(where);
  const items = await db
    .select({
      id: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
      otherNames: students.otherNames,
      sex: students.sex,
      status: students.status,
      className: classes.name,
      isBoarder: sql<boolean>`coalesce(${enrolments.isBoarder}, false)`,
    })
    .from(students)
    .leftJoin(enrolments, thisYearsEnrolment(params.academicYearId))
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .where(where)
    .orderBy(asc(students.surname), asc(students.firstName), asc(students.id))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return { items, total: totalRow?.total ?? 0 };
}

export async function findStudent(db: Db | Tx, params: { schoolId: string; id: string }) {
  const [row] = await db
    .select()
    .from(students)
    .where(and(eq(students.schoolId, params.schoolId), eq(students.id, params.id)));
  return row ?? null;
}

export async function isStudentInReach(
  db: Db,
  params: { studentId: string; reach: StudentReach | null },
): Promise<boolean> {
  if (params.reach === null) return false;
  if (params.reach.kind === 'all') return true;
  const rows = await db.execute<{ ok: boolean }>(
    sql`select ${studentInReach(params.reach, sql`${params.studentId}::uuid`)} as ok`,
  );
  return rows[0]?.ok === true;
}

export async function findCurrentEnrolment(
  db: Db,
  params: { studentId: string; academicYearId: string | null },
) {
  if (params.academicYearId === null) return null;
  const [row] = await db
    .select({
      classId: classes.id,
      className: classes.name,
      academicYearName: academicYears.name,
      status: enrolments.status,
      isBoarder: enrolments.isBoarder,
    })
    .from(enrolments)
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .innerJoin(academicYears, eq(academicYears.id, enrolments.academicYearId))
    .where(
      and(
        eq(enrolments.studentId, params.studentId),
        eq(enrolments.academicYearId, params.academicYearId),
        isNull(enrolments.archivedAt),
      ),
    );
  return row ?? null;
}

export async function listGuardianLinks(db: Db, params: { schoolId: string; studentId: string }) {
  return db
    .select({
      guardianId: guardians.id,
      surname: guardians.surname,
      firstName: guardians.firstName,
      otherNames: guardians.otherNames,
      relationship: studentGuardians.relationship,
      isMainContact: studentGuardians.isMainContact,
      primaryPhone: guardians.primaryPhone,
      whatsappPhone: guardians.whatsappPhone,
      whatsappOptIn: studentGuardians.whatsappOptIn,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(
      and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.studentId, params.studentId),
        isNull(studentGuardians.archivedAt),
        isNull(guardians.archivedAt),
      ),
    )
    .orderBy(sql`${studentGuardians.isMainContact} desc`, asc(guardians.surname), asc(guardians.firstName));
}

export async function listMedicalNotes(db: Db, params: { schoolId: string; studentId: string }) {
  return db
    .select({
      id: studentMedicalNotes.id,
      note: studentMedicalNotes.note,
      createdAt: studentMedicalNotes.createdAt,
    })
    .from(studentMedicalNotes)
    .where(
      and(
        eq(studentMedicalNotes.schoolId, params.schoolId),
        eq(studentMedicalNotes.studentId, params.studentId),
        isNull(studentMedicalNotes.archivedAt),
      ),
    )
    .orderBy(asc(studentMedicalNotes.createdAt));
}

export async function updateStudent(
  tx: Tx,
  params: { schoolId: string; id: string; changes: StudentEdit },
): Promise<void> {
  await tx
    .update(students)
    .set(params.changes)
    .where(and(eq(students.schoolId, params.schoolId), eq(students.id, params.id)));
}
