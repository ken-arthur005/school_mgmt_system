import { uuidv7 } from '@school-mgmt/shared';
import { type SQL, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// `schools`, `users` and the shared columns live together because every other table points at
// both. Keeping them in one module avoids circular imports between schema files.

const primaryId = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/**
 * Exception to "every table has school_id": this is the tenant table itself. `created_by` is
 * nullable because the school row has to exist before its first user can.
 */
export const schools = pgTable('schools', {
  id: primaryId(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  timezone: text('timezone').notNull().default('Africa/Accra'),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }),
  ...timestamps(),
});

/** Logins. Staff details live in `staff`; `auth_user_id` links to Supabase Auth (Sprint 2). */
export const users = pgTable(
  'users',
  {
    id: primaryId(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    authUserId: uuid('auth_user_id'),
    displayName: text('display_name').notNull(),
    // One per school: the actor for seed data and background jobs.
    isSystem: boolean('is_system').notNull().default(false),
    createdBy: uuid('created_by').references((): AnyPgColumn => users.id, {
      onDelete: 'restrict',
    }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('users_auth_user_id_key').on(t.authUserId),
    uniqueIndex('users_one_system_user_per_school')
      .on(t.schoolId)
      .where(sql`${t.isSystem}`),
    index('users_school_id_idx').on(t.schoolId),
    check('users_created_by_required', sql`${t.createdBy} IS NOT NULL OR ${t.isSystem}`),
    check('users_display_name_not_blank', sql`btrim(${t.displayName}) <> ''`),
  ],
);

/** id, school_id, timestamps, created_by and archived_at: the columns every table carries. */
export const baseColumns = () => ({
  id: primaryId(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'restrict' }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  ...timestamps(),
});

/** CHECK body limiting a text column to a fixed list (mirrors a zod enum in @school-mgmt/shared). */
export function oneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  const literals = values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
  return sql`${column} IN (${sql.raw(literals)})`;
}

/** CHECK body for a Ghana phone number stored in E.164 form. */
export function ghanaPhone(column: AnyPgColumn): SQL {
  return sql`${column} ~ '^\\+233[0-9]{9}$'`;
}

/** Only rows that haven't been archived take part in uniqueness rules. */
export function notArchived(column: AnyPgColumn): SQL {
  return sql`${column} IS NULL`;
}
