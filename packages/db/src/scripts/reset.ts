import { createDb } from '../client';
import { assertNotProduction, loadDbEnv } from '../env';
import { dropEverything, runMigrations } from '../maintenance';
import { seedDatabase } from '../seed';
import { summariseSeed } from './summary';

// Rebuilds the database from nothing: drop our tables → apply every migration → seed.
const env = loadDbEnv();
assertNotProduction(env);

const { db, close } = createDb(env.DATABASE_URL, { max: 1 });
try {
  await dropEverything(db);
  await runMigrations(db);
  const data = await seedDatabase(db);
  console.log(summariseSeed(data));
} finally {
  await close();
}
