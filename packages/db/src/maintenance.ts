import { fileURLToPath } from 'node:url';
import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Db } from './client';
import * as schema from './schema';

const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

/** Every table defined in our schema, by name. */
export const TABLE_NAMES: readonly string[] = Object.values(schema).flatMap((value) =>
  is(value, PgTable) ? [getTableName(value)] : [],
);

/** Tables carrying the audit_row_change trigger (see migrations/0001_triggers_and_rls.sql). */
export const AUDITED_TABLES = [
  'families',
  'students',
  'student_medical_notes',
  'guardians',
  'student_guardians',
  'enrolments',
  'classes',
  'staff',
  'staff_assignments',
  'users',
  'user_roles',
] as const;

const quotedTableList = (): string => TABLE_NAMES.map((name) => `"${name}"`).join(', ');

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}

/**
 * Drops our tables, trigger functions and Drizzle's migration journal, leaving anything else in
 * the database alone. Callers must check the environment first.
 */
export async function dropEverything(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`DROP TABLE IF EXISTS ${quotedTableList()} CASCADE`));
    await tx.execute(
      sql.raw(
        'DROP FUNCTION IF EXISTS set_updated_at(), audit_row_change(), reject_audit_log_change() CASCADE',
      ),
    );
    await tx.execute(sql.raw('DROP SCHEMA IF EXISTS drizzle CASCADE'));
  });
}
