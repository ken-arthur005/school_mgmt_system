import { createDb } from '../client';
import { assertNotProduction, loadDbEnv } from '../env';
import { seedDatabase } from '../seed';
import { summariseSeed } from './summary';

const env = loadDbEnv();
assertNotProduction(env);

const { db, close } = createDb(env.DATABASE_URL, { max: 1 });
try {
  const data = await seedDatabase(db);
  console.log(summariseSeed(data));
} finally {
  await close();
}
