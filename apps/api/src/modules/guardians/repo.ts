import { type Db, schema, type Tx } from '@school-mgmt/db';
import type { GuardianEdit, GuardianListQuery } from '@school-mgmt/shared';
import { and, asc, count, eq, exists, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { StudentReach } from '../../access';
import { nameMatches, studentInReach } from '../students/repo';

const { guardians, studentGuardians, students } = schema;

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

export async function listGuardians(
  db: Db,
  params: { schoolId: string; reach: StudentReach; query: GuardianListQuery; phone: string | null },
) {
  const { query, phone } = params;
  const search =
    query.q === undefined
      ? undefined
      : phone !== null
        ? or(
            eq(guardians.primaryPhone, phone),
            eq(guardians.whatsappPhone, phone),
            eq(guardians.secondaryPhone, phone),
          )
        : nameMatches(
            query.q,
            sql`${guardians.firstName}`,
            sql`${guardians.otherNames}`,
            sql`${guardians.surname}`,
          );
  const where = and(
    eq(guardians.schoolId, params.schoolId),
    isNull(guardians.archivedAt),
    search,
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
  params: { schoolId: string; guardianId: string; reach: StudentReach },
) {
  return db
    .select({
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
