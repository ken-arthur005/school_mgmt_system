import { type Db, schema } from '@school-mgmt/db';
import { and, asc, eq, isNull } from 'drizzle-orm';

const { staff } = schema;

export async function listStaff(db: Db, params: { schoolId: string }) {
  return db
    .select({
      id: staff.id,
      surname: staff.surname,
      firstName: staff.firstName,
      jobTitle: staff.jobTitle,
      photoPath: staff.photoPath,
    })
    .from(staff)
    .where(and(eq(staff.schoolId, params.schoolId), isNull(staff.archivedAt)))
    .orderBy(asc(staff.surname), asc(staff.firstName), asc(staff.id));
}

/** A current member of this school's staff, or null. */
export async function findStaff(db: Db, params: { schoolId: string; id: string }) {
  const [row] = await db
    .select()
    .from(staff)
    .where(
      and(eq(staff.schoolId, params.schoolId), eq(staff.id, params.id), isNull(staff.archivedAt)),
    );
  return row ?? null;
}
