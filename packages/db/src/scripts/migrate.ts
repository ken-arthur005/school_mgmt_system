import { createDb } from '../client';
import { loadDbEnv } from '../env';
import { runMigrations } from '../maintenance';

const env = loadDbEnv();
const { db, close } = createDb(env.DATABASE_URL, { max: 1 });
try {
  await runMigrations(db);
  console.log('Migrations applied.');
} finally {
  await close();
}
