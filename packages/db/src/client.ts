import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface DbConnection {
  db: Db;
  close: () => Promise<void>;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalDatabaseUrl(url: string): boolean {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}

export function createDb(url: string, options: { max?: number } = {}): DbConnection {
  const client = postgres(url, {
    max: options.max ?? 10,
    // Supabase (and any remote host) must be reached over TLS; the local Docker DB has none.
    ssl: isLocalDatabaseUrl(url) ? false : 'require',
    onnotice: () => undefined,
  });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}

/** Who is making a change. Recorded by the audit triggers. */
export interface Actor {
  userId: string;
  /** The device the change came from. Empty until devices are registered (Sprint 4). */
  deviceId?: string | null;
}

/** Tells the audit triggers who is acting, for the rest of this transaction only. */
export async function setActor(tx: Tx, actor: Actor): Promise<void> {
  await tx.execute(sql`select set_config('app.user_id', ${actor.userId}, true)`);
  await tx.execute(sql`select set_config('app.device_id', ${actor.deviceId ?? ''}, true)`);
}

/**
 * Runs `work` in a transaction with the actor set. Every audited write goes through this: the
 * database refuses audited changes with no actor (migration 0002).
 */
export async function withActor<T>(db: Db, actor: Actor, work: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await setActor(tx, actor);
    return work(tx);
  });
}
