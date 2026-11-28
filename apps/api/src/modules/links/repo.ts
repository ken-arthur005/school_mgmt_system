import { schema, type Tx } from '@school-mgmt/db';
import type { Relationship } from '@school-mgmt/shared';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';

const { guardians, studentGuardians, students } = schema;

/**
 * Holds the student's row until the transaction ends, so two people changing the same student's
 * guardians take turns and the "one main contact, at least one guardian" rules hold.
 */
export async function lockStudent(tx: Tx, studentId: string): Promise<void> {
  await tx
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId))
    .for('update');
}

export async function findLink(tx: Tx, params: { schoolId: string; id: string }) {
  const [row] = await tx
    .select()
    .from(studentGuardians)
    .where(and(eq(studentGuardians.schoolId, params.schoolId), eq(studentGuardians.id, params.id)));
  return row ?? null;
}

/** The student's current (not removed) guardian links. */
export async function listActiveLinks(tx: Tx, params: { schoolId: string; studentId: string }) {
  return tx
    .select()
    .from(studentGuardians)
    .where(
      and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.studentId, params.studentId),
        isNull(studentGuardians.archivedAt),
      ),
    );
}

export async function insertLink(
  tx: Tx,
  values: {
    id?: string;
    schoolId: string;
    createdBy: string;
    studentId: string;
    guardianId: string;
    relationship: Relationship;
    isMainContact: boolean;
    whatsappOptIn: boolean;
    whatsappOptInAt: Date | null;
  },
): Promise<void> {
  await tx.insert(studentGuardians).values(values);
}

export async function updateLink(
  tx: Tx,
  params: {
    schoolId: string;
    id: string;
    changes: PgUpdateSetSource<typeof studentGuardians>;
  },
): Promise<void> {
  await tx
    .update(studentGuardians)
    .set(params.changes)
    .where(and(eq(studentGuardians.schoolId, params.schoolId), eq(studentGuardians.id, params.id)));
}

/** Must run before another link becomes the main contact: the database allows only one. */
export async function clearMainContact(
  tx: Tx,
  params: { schoolId: string; studentId: string },
): Promise<void> {
  await tx
    .update(studentGuardians)
    .set({ isMainContact: false })
    .where(
      and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.studentId, params.studentId),
        eq(studentGuardians.isMainContact, true),
        isNull(studentGuardians.archivedAt),
      ),
    );
}

/** Any guardian row with this id, in any school. */
export async function guardianIdTaken(tx: Tx, id: string): Promise<boolean> {
  const rows = await tx.select({ id: guardians.id }).from(guardians).where(eq(guardians.id, id));
  return rows.length > 0;
}

/** Guardians already on file with any of these phone numbers. */
export async function listGuardiansByPhone(tx: Tx, params: { schoolId: string; phones: string[] }) {
  return tx
    .select({
      id: guardians.id,
      surname: guardians.surname,
      firstName: guardians.firstName,
      otherNames: guardians.otherNames,
      primaryPhone: guardians.primaryPhone,
      whatsappPhone: guardians.whatsappPhone,
    })
    .from(guardians)
    .where(
      and(
        eq(guardians.schoolId, params.schoolId),
        isNull(guardians.archivedAt),
        or(
          inArray(guardians.primaryPhone, params.phones),
          inArray(guardians.whatsappPhone, params.phones),
          inArray(guardians.secondaryPhone, params.phones),
        ),
      ),
    )
    .limit(5);
}

export async function insertGuardian(tx: Tx, values: typeof guardians.$inferInsert): Promise<void> {
  await tx.insert(guardians).values(values);
}
