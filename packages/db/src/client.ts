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
