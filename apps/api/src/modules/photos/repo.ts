import { schema, type Tx } from '@school-mgmt/db';
import { and, eq } from 'drizzle-orm';

const TABLES = {
  students: schema.students,
  guardians: schema.guardians,
  staff: schema.staff,
};

export type PhotoTable = keyof typeof TABLES;

export async function setPhotoPath(
  tx: Tx,
  params: { schoolId: string; table: PhotoTable; id: string; path: string | null },
): Promise<void> {
  const table = TABLES[params.table];
  await tx
    .update(table)
    .set({ photoPath: params.path })
    .where(and(eq(table.schoolId, params.schoolId), eq(table.id, params.id)));
}
