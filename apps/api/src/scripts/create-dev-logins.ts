// Dev/staging only: gives every seeded staff login a Supabase Auth account (email + phone +
// one shared password), already confirmed, and links it to `users.auth_user_id`.
// Re-runnable: after `pnpm db:reset` the users get new ids, and this relinks them by email.
// Refuses production: real staff accounts are created by the office (Sprint 5).

import { createDb, schema, withActor } from '@school-mgmt/db';
import { appEnvSchema } from '@school-mgmt/shared';
import { createClient, type User } from '@supabase/supabase-js';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

const env = z
  .object({
    APP_ENV: appEnvSchema,
    DATABASE_URL: z.url(),
    SUPABASE_URL: z.url(),
    // Server-only. Supabase dashboard → Project Settings → API keys → secret key.
    SUPABASE_SECRET_KEY: z.string().min(1),
    // The password every dev login gets. Never a real person's password.
    DEV_LOGIN_PASSWORD: z.string().min(12, 'DEV_LOGIN_PASSWORD must be at least 12 characters'),
  })
  .parse(process.env);

if (env.APP_ENV === 'production') {
  throw new Error('Refusing to run: APP_ENV is production. Dev logins are for seed data only.');
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function allAuthUsers(): Promise<User[]> {
  const found: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error !== null) throw error;
    found.push(...data.users);
    if (data.users.length < 1000) return found;
  }
}

const { db, close } = createDb(env.DATABASE_URL, { max: 1 });
try {
  const [systemUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.isSystem, true));
  if (systemUser === undefined) throw new Error('No System user: run `pnpm db:reset` first.');

  const staffLogins = await db
    .select({
      userId: schema.users.id,
      email: schema.staff.email,
      phone: schema.staff.phone,
      roles: sql<string>`(select string_agg(r.role, ', ' order by r.role) from ${schema.userRoles} r
                          where r.user_id = ${schema.users.id} and r.archived_at is null)`,
    })
    .from(schema.users)
    .innerJoin(schema.staff, eq(schema.staff.userId, schema.users.id))
    .where(and(eq(schema.users.isSystem, false), isNull(schema.users.archivedAt)))
    .orderBy(schema.staff.surname, schema.staff.firstName);

  const byEmail = new Map((await allAuthUsers()).map((user) => [user.email ?? '', user]));
  const rows: { roles: string; email: string; phone: string | null }[] = [];

  for (const login of staffLogins) {
    if (login.email === null) continue;
    const attributes = {
      email: login.email,
      ...(login.phone === null ? {} : { phone: login.phone }),
      password: env.DEV_LOGIN_PASSWORD,
      email_confirm: true,
      phone_confirm: true,
    };
    const existing = byEmail.get(login.email);
    const result =
      existing === undefined
        ? await supabase.auth.admin.createUser(attributes)
        : await supabase.auth.admin.updateUserById(existing.id, attributes);
    if (result.error !== null) {
      throw new Error(`Supabase refused ${login.email}: ${result.error.message}`);
    }
    const authUserId = result.data.user.id;

    await withActor(db, { userId: systemUser.id }, async (tx) => {
      // An auth id can belong to one user only; clear it from any stale row first.
      await tx
        .update(schema.users)
        .set({ authUserId: null })
        .where(and(eq(schema.users.authUserId, authUserId), ne(schema.users.id, login.userId)));
      await tx.update(schema.users).set({ authUserId }).where(eq(schema.users.id, login.userId));
    });
    rows.push({ roles: login.roles, email: login.email, phone: login.phone });
  }

  console.log(`Linked ${rows.length} dev logins. Password: the DEV_LOGIN_PASSWORD you set.`);
  console.table(rows);
} finally {
  await close();
}
