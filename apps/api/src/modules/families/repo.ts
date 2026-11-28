import { type Db, schema, type Tx } from '@school-mgmt/db';
import { and, asc, count, eq, exists, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { escapeLike, nameMatches, thisYearsEnrolment } from '../students/repo';

const { classes, enrolments, families, guardians, studentGuardians, students } = schema;

/**
 * Families with at least one child, by name. A search matches the family's name or a child's.
 */
export async function listFamilies(
  db: Db,
  params: { schoolId: string; page: number; pageSize: number; search: string | null },
) {
  const hasChild = (condition?: ReturnType<typeof nameMatches>) =>
    exists(
      sql`(select 1 from ${students} where ${and(
        eq(students.familyId, families.id),
        isNull(students.archivedAt),
        condition,
      )})`,
    );
  const where = and(
    eq(families.schoolId, params.schoolId),
    isNull(families.archivedAt),
    hasChild(),
    params.search === null
      ? undefined
      : or(
          ilike(families.name, `%${escapeLike(params.search)}%`),
          hasChild(
            nameMatches(
              params.search,
              sql`${students.firstName}`,
              sql`${students.otherNames}`,
              sql`${students.surname}`,
            ),
          ),
        ),
  );

  const [totalRow] = await db.select({ total: count() }).from(families).where(where);
  const items = await db
    .select({ id: families.id, name: families.name })
    .from(families)
    .where(where)
    .orderBy(asc(families.name), asc(families.id))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);
  return { items, total: totalRow?.total ?? 0 };
}

export async function findFamily(db: Db | Tx, params: { schoolId: string; id: string }) {
  const [row] = await db
    .select()
    .from(families)
    .where(and(eq(families.schoolId, params.schoolId), eq(families.id, params.id)));
  return row ?? null;
}

/** Any family row with this id, in any school. */
export async function familyIdTaken(tx: Tx, id: string): Promise<boolean> {
  const rows = await tx.select({ id: families.id }).from(families).where(eq(families.id, id));
  return rows.length > 0;
}

/** The children of these families, with this year's class. */
export async function listChildren(
  db: Db,
  params: { schoolId: string; familyIds: string[]; academicYearId: string | null },
) {
  if (params.familyIds.length === 0) return [];
  return db
    .select({
      familyId: families.id,
      studentId: students.id,
      admissionNumber: students.admissionNumber,
      surname: students.surname,
      firstName: students.firstName,
      status: students.status,
      className: classes.name,
      photoPath: students.photoPath,
    })
    .from(students)
    .innerJoin(families, eq(families.id, students.familyId))
    .leftJoin(enrolments, thisYearsEnrolment(params.academicYearId))
    .leftJoin(classes, eq(classes.id, enrolments.classId))
    .where(
      and(
        eq(students.schoolId, params.schoolId),
        inArray(students.familyId, params.familyIds),
        isNull(students.archivedAt),
      ),
    )
    .orderBy(asc(students.dateOfBirth), asc(students.id));
}

/** One row per (guardian, child of this family) link. */
export async function listFamilyGuardians(db: Db, params: { schoolId: string; familyId: string }) {
  return db
    .select({
      guardianId: guardians.id,
      surname: guardians.surname,
      firstName: guardians.firstName,
      primaryPhone: guardians.primaryPhone,
      photoPath: guardians.photoPath,
      studentId: students.id,
      childFirstName: students.firstName,
      relationship: studentGuardians.relationship,
      isMainContact: studentGuardians.isMainContact,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .where(
      and(
        eq(students.schoolId, params.schoolId),
        eq(students.familyId, params.familyId),
        isNull(students.archivedAt),
        isNull(studentGuardians.archivedAt),
        isNull(guardians.archivedAt),
      ),
    )
    .orderBy(asc(guardians.surname), asc(guardians.firstName), asc(students.dateOfBirth));
}

/** These students (in this school, not archived), held until the transaction ends. */
export async function lockStudents(tx: Tx, params: { schoolId: string; ids: string[] }) {
  return tx
    .select({ id: students.id, surname: students.surname, familyId: students.familyId })
    .from(students)
    .where(
      and(
        eq(students.schoolId, params.schoolId),
        inArray(students.id, params.ids),
        isNull(students.archivedAt),
      ),
    )
    .orderBy(asc(students.id))
    .for('update');
}

export async function insertFamily(tx: Tx, values: typeof families.$inferInsert): Promise<void> {
  await tx.insert(families).values(values);
}

export async function renameFamily(
  tx: Tx,
  params: { schoolId: string; id: string; name: string },
): Promise<void> {
  await tx
    .update(families)
    .set({ name: params.name })
    .where(and(eq(families.schoolId, params.schoolId), eq(families.id, params.id)));
}

export async function setFamily(
  tx: Tx,
  params: { schoolId: string; studentIds: string[]; familyId: string | null },
): Promise<void> {
  await tx
    .update(students)
    .set({ familyId: params.familyId })
    .where(and(eq(students.schoolId, params.schoolId), inArray(students.id, params.studentIds)));
}
