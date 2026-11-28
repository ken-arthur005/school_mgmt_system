import { type Db, schema, type Tx } from '@school-mgmt/db';
import type { GuardianEdit, GuardianListQuery } from '@school-mgmt/shared';
import { and, asc, count, eq, exists, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { StudentReach } from '../../access';
import { nameMatches, type SearchText, studentInReach, thisYearsEnrolment } from '../students/repo';

const { classes, enrolments, guardians, studentGuardians, students } = schema;

/**
 * SQL condition: the guardian (`guardians.id`) is within reach. School-wide reach sees every
 * guardian; limited reach sees guardians linked to a student within reach.
 */
function guardianInReach(reach: StudentReach, guardianId: SQL | typeof guardians.id): SQL {
  if (reach.kind === 'all') {
    return sql`true`;
  }
  return exists(
    sql`(select 1 from ${studentGuardians} inner join ${students} on ${eq(
      students.id,
      studentGuardians.studentId,
    )} where ${and(
      sql`${studentGuardians.guardianId} = ${guardianId}`,
      isNull(studentGuardians.archivedAt),
      isNull(students.archivedAt),
      studentInReach(reach, students.id),
    )})`,
  );
}

function searchCondition({ text, phone }: SearchText): SQL | undefined {
  if (phone !== null) {
    return or(
      eq(guardians.primaryPhone, phone),
      eq(guardians.whatsappPhone, phone),
      eq(guardians.secondaryPhone, phone),
    );
  }
  return nameMatches(
    text,
    sql`${guardians.firstName}`,
    sql`${guardians.otherNames}`,
    sql`${guardians.surname}`,
  );
}

export async function listGuardians(
  db: Db,
  params: {
    schoolId: string;
    reach: StudentReach;
    query: GuardianListQuery;
    search: SearchText | null;
  },
) {
  const { query } = params;
  const where = and(
    eq(guardians.schoolId, params.schoolId),
    isNull(guardians.archivedAt),
    params.search === null ? undefined : searchCondition(params.search),
    guardianInReach(params.reach, guardians.id),
  );

  const [totalRow] = await db.select({ total: count() }).from(guardians).where(where);
  const items = await db
    .select({
      id: guardians.id,
      surname: guardians.surname,
      firstName: guardians.firstName,
      otherNames: guardians.otherNames,
      primaryPhone: guardians.primaryPhone,
      whatsappPhone: guardians.whatsappPhone,
      photoPath: guardians.photoPath,
    })
    .from(guardians)
    .where(where)
    .orderBy(asc(guardians.surname), asc(guardians.firstName), asc(guardians.id))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return { items, total: totalRow?.total ?? 0 };
}

/** A guardian in this school that hasn't been archived, or null. */
export async function findGuardian(db: Db | Tx, params: { schoolId: string; id: string }) {
  const [row] = await db
    .select()
    .from(guardians)
    .where(
      and(
        eq(guardians.schoolId, params.schoolId),
        eq(guardians.id, params.id),
        isNull(guardians.archivedAt),
      ),
    );
  return row ?? null;
}

export async function isGuardianInReach(
  db: Db,
  params: { guardianId: string; reach: StudentReach | null },
): Promise<boolean> {
  if (params.reach === null) return false;
  if (params.reach.kind === 'all') return true;
  const rows = await db.execute<{ ok: boolean }>(
    sql`select ${guardianInReach(params.reach, sql`${params.guardianId}::uuid`)} as ok`,
  );
  return rows[0]?.ok === true;
}

/** The guardian's children that the caller may see. */
export async function listChildren(
  db: Db,
  params: {
    schoolId: string;
    guardianId: string;
    reach: StudentReach;
    academicYearId: string | null;
  },
) {
  return db
    .select({
      linkId: studentGuardians.id,
      className: classes.name,
      photoPath: students.photoPath,
      studentId: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
      status: students.status,
      relationship: studentGuardians.relationship,
      isMainContact: studentGuardians.isMainContact,
      whatsappOptIn: studentGuardians.whatsappOptIn,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .leftJoin(enrolments, thisYearsEnrolment(params.academicYearId))
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .where(
      and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.guardianId, params.guardianId),
        isNull(studentGuardians.archivedAt),
        isNull(students.archivedAt),
        studentInReach(params.reach, students.id),
      ),
    )
    .orderBy(asc(students.firstName), asc(students.surname));
}

export async function updateGuardian(
  tx: Tx,
  params: { schoolId: string; id: string; changes: GuardianEdit },
): Promise<void> {
  await tx
    .update(guardians)
    .set(params.changes)
    .where(and(eq(guardians.schoolId, params.schoolId), eq(guardians.id, params.id)));
}

/** Consent was given for a particular number, so a new WhatsApp number starts without it. */
export async function clearWhatsappConsent(
  tx: Tx,
  params: { schoolId: string; guardianId: string },
): Promise<void> {
  await tx
    .update(studentGuardians)
    .set({ whatsappOptIn: false, whatsappOptInAt: null })
    .where(
      and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.guardianId, params.guardianId),
        eq(studentGuardians.whatsappOptIn, true),
        isNull(studentGuardians.archivedAt),
      ),
    );
}
