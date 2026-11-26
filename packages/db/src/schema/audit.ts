import { AUDIT_OPERATIONS } from '@school-mgmt/shared';
import { bigint, check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { oneOf, schools, users } from './core';

/**
 * Written only by the `audit_row_change()` trigger, never by app code, and append-only.
 * Documented exception to the standard columns: the id is a sequence (triggers can't make
 * UUIDv7 before Postgres 18, and it gives a strict order), and rows are never archived.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    tableName: text('table_name').notNull(),
    rowId: uuid('row_id').notNull(),
    operation: text('operation', { enum: AUDIT_OPERATIONS }).notNull(),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    // From the `app.user_id` / `app.device_id` settings the API sets per transaction.
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    deviceId: uuid('device_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_table_row_idx').on(t.tableName, t.rowId),
    index('audit_log_school_created_at_idx').on(t.schoolId, t.createdAt),
    check('audit_log_operation_valid', oneOf(t.operation, AUDIT_OPERATIONS)),
  ],
);
