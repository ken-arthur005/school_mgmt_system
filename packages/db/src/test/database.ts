import { and, eq, sql } from 'drizzle-orm';
import { createDb, type Db, isLocalDatabaseUrl, setActor, type Tx } from '../client';
import { dropEverything, runMigrations } from '../maintenance';
import { academicYears, classes, schools, staff, students, users } from '../schema';
import { seedDatabase } from '../seed';
import { SEED_SCHOOL } from '../seed/school-plan';

/**
 * The tests wipe the database they use, so it must be the local Docker one. Packages that test
 * in parallel each use their own database on that server (`databaseName`), so one package's
 * rebuild never pulls the rug from under another's tests.
 */
export function testDatabaseUrl(databaseName?: string): string {
  const url = process.env['TEST_DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error(
      'TEST_DATABASE_URL is not set. Run `pnpm db:test:up` and copy the package .env.example to .env.',
    );
  }
  if (!isLocalDatabaseUrl(url)) {
    throw new Error('TEST_DATABASE_URL must point at localhost: the database tests wipe it.');
  }
  if (databaseName === undefined) {
    return url;
  }
  const named = new URL(url);
  named.pathname = `/${databaseName}`;
  return named.toString();
}

export function connectTestDb(databaseName?: string) {
  return createDb(testDatabaseUrl(databaseName), { max: 2 });
}

/** Creates the named test database on the TEST_DATABASE_URL server if it isn't there yet. */
export async function ensureTestDatabase(databaseName: string): Promise<void> {
  if (!/^[a-z0-9_]+$/.test(databaseName)) {
    throw new Error(`Bad test database name: ${databaseName}`);
  }
  const { db, close } = connectTestDb();
  try {
    const found = await db.execute(sql`select 1 from pg_database where datname = ${databaseName}`);
    if (found.length === 0) {
      await db.execute(sql.raw(`CREATE DATABASE "${databaseName}"`));
    }
  } finally {
    await close();
  }
}

/** Drop our tables, apply every migration and seed. Used by each package's vitest global setup. */
export async function rebuildTestDatabase(databaseName?: string): Promise<void> {
  const { db, close } = connectTestDb(databaseName);
  try {
    await dropEverything(db);
    await runMigrations(db);
    await seedDatabase(db);
  } finally {
    await close();
  }
}

class Rollback extends Error {}

/**
 * Runs `work` in a transaction that is always rolled back, so tests leave the seed untouched.
 * It acts as the school's System user unless `actor` says otherwise (`null` = no actor at all,
 * to prove the database refuses that).
 */
export async function inRollback(
  db: Db,
  work: (tx: Tx) => Promise<void>,
  options: { actor?: string | null } = {},
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const actor = options.actor === undefined ? await systemUserId(tx) : options.actor;
      if (actor !== null) {
        await setActor(tx, { userId: actor });
      }
      await work(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      throw error;
    }
  }
}

async function single<T>(rows: Promise<T[]>, what: string): Promise<T> {
  const found = await rows;
  if (found.length !== 1 || found[0] === undefined) {
    throw new Error(`Expected exactly one ${what}, found ${found.length}`);
  }
  return found[0];
}

/** Looks up seed rows by their human names, so tests read like the school talks. */
export function seedLookup(db: Db) {
  return {
    schoolId: async () =>
      (
        await single(
          db.select({ id: schools.id }).from(schools).where(eq(schools.name, SEED_SCHOOL.name)),
          'school',
        )
      ).id,
    academicYearId: async (name: string) =>
      (
        await single(
          db
            .select({ id: academicYears.id })
            .from(academicYears)
            .where(eq(academicYears.name, name)),
          name,
        )
      ).id,
    classId: async (academicYearId: string, name: string) =>
      (
        await single(
          db
            .select({ id: classes.id })
            .from(classes)
            .where(and(eq(classes.academicYearId, academicYearId), eq(classes.name, name))),
          name,
        )
      ).id,
    student: async (firstName: string, surname: string) =>
      single(
        db
          .select()
          .from(students)
          .where(and(eq(students.firstName, firstName), eq(students.surname, surname))),
        `${firstName} ${surname}`,
      ),
    staffId: async (firstName: string, surname: string) =>
      (
        await single(
          db
            .select({ id: staff.id })
            .from(staff)
            .where(and(eq(staff.firstName, firstName), eq(staff.surname, surname))),
          `${firstName} ${surname}`,
        )
      ).id,
  };
}

async function systemUserId(tx: Tx): Promise<string> {
  const [row] = await tx.select({ id: users.id }).from(users).where(eq(users.isSystem, true));
  if (row === undefined) {
    throw new Error('The seed has no System user');
  }
  return row.id;
}
