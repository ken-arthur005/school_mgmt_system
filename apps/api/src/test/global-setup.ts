import { withActor } from '@school-mgmt/db';
import { connectTestDb, ensureTestDatabase, rebuildTestDatabase } from '@school-mgmt/db/testing';
import { sql } from 'drizzle-orm';
import { API_TEST_DATABASE } from './constants';

/**
 * Once per run: a fresh seeded database just for the API tests (the db package's tests use
 * their own, and both run in parallel). Every login is linked to an auth id equal to its user
 * id, so tests can sign tokens without Supabase.
 */
export default async function setup(): Promise<void> {
  await ensureTestDatabase(API_TEST_DATABASE);
  await rebuildTestDatabase(API_TEST_DATABASE);

  const { db, close } = connectTestDb(API_TEST_DATABASE);
  try {
    const rows = await db.execute<{ id: string }>(sql`select id from users where is_system`);
    const systemUserId = rows[0]?.id;
    if (systemUserId === undefined) throw new Error('The seed has no System user');
    await withActor(db, { userId: systemUserId }, (tx) =>
      tx.execute(sql`update users set auth_user_id = id where not is_system`),
    );
  } finally {
    await close();
  }
}
