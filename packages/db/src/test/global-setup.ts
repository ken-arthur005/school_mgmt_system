import { rebuildTestDatabase } from './database';

/** Once per test run: rebuild the local test database from the migrations and seed it. */
export default async function setup(): Promise<void> {
  await rebuildTestDatabase();
}
