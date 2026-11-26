import { dropEverything, runMigrations } from '../maintenance';
import { seedDatabase } from '../seed';
import { connectTestDb } from './database';

/** Once per test run: rebuild the local test database from the migrations and seed it. */
export default async function setup(): Promise<void> {
  const { db, close } = connectTestDb();
  try {
    await dropEverything(db);
    await runMigrations(db);
    await seedDatabase(db);
  } finally {
    await close();
  }
}
