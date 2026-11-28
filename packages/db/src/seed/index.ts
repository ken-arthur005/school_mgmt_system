import { eq, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Db, Tx } from '../client';
import { AUDITED_TABLES, TABLE_NAMES } from '../maintenance';
import * as schema from '../schema';
import { DEFAULT_SEED, generateSeedData, type SeedData } from './generate';

const BATCH_SIZE = 500;

async function insertInBatches<T extends PgTable>(
  tx: Tx,
  table: T,
  rows: readonly T['$inferInsert'][],
): Promise<void> {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    await tx.insert(table).values(rows.slice(start, start + BATCH_SIZE));
  }
}

async function setAuditTriggers(tx: Tx, enabled: boolean): Promise<void> {
  const action = enabled ? 'ENABLE' : 'DISABLE';
  for (const table of AUDITED_TABLES) {
    await tx.execute(sql.raw(`ALTER TABLE "${table}" ${action} TRIGGER audit_row_change`));
  }
}

/**
 * Wipes every row from our tables and writes a fresh fake school, all in one transaction.
 * Audit triggers are switched off for the duration (seed data has no history worth keeping) and
 * switched back on before commit, so nothing outside this transaction ever runs without them.
 * Callers must refuse production first.
 */
export async function seedDatabase(db: Db, seed: number = DEFAULT_SEED): Promise<SeedData> {
  const data = generateSeedData(seed);

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw('ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_truncate'));
    await tx.execute(
      sql.raw(
        `TRUNCATE ${TABLE_NAMES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
      ),
    );
    await tx.execute(sql.raw('ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_truncate'));
    await setAuditTriggers(tx, false);

    // schools and users point at each other, so the school gets its creator afterwards.
    await tx.insert(schema.schools).values(data.school);
    await tx.insert(schema.users).values(data.systemUser);
    await tx
      .update(schema.schools)
      .set({ createdBy: data.systemUser.id })
      .where(eq(schema.schools.id, data.school.id ?? ''));

    await insertInBatches(tx, schema.users, data.users);
    await insertInBatches(tx, schema.userRoles, data.userRoles);
    await insertInBatches(tx, schema.staff, data.staff);
    await insertInBatches(tx, schema.academicYears, data.academicYears);
    await insertInBatches(tx, schema.terms, data.terms);
    await insertInBatches(tx, schema.levels, data.levels);
    await insertInBatches(tx, schema.subjects, data.subjects);
    await insertInBatches(tx, schema.classes, data.classes);
    await insertInBatches(tx, schema.classSubjects, data.classSubjects);
    await insertInBatches(tx, schema.staffAssignments, data.staffAssignments);
    await insertInBatches(tx, schema.families, data.families);
    await insertInBatches(tx, schema.students, data.students);
    await insertInBatches(tx, schema.studentMedicalNotes, data.studentMedicalNotes);
    await insertInBatches(tx, schema.guardians, data.guardians);
    await insertInBatches(tx, schema.studentGuardians, data.studentGuardians);
    await insertInBatches(tx, schema.enrolments, data.enrolments);

    await setAuditTriggers(tx, true);
  });

  return data;
}
