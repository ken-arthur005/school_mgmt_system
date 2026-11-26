import { and, eq } from 'drizzle-orm';
import { createDb, type Db, isLocalDatabaseUrl, type Tx } from '../client';
import { academicYears, classes, schools, staff, students } from '../schema';
import { SEED_SCHOOL } from '../seed/school-plan';

/** The tests wipe the database they use, so it must be the local Docker one. */
export function testDatabaseUrl(): string {
  const url = process.env['TEST_DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error(
      'TEST_DATABASE_URL is not set. Run `pnpm db:test:up` and copy packages/db/.env.example to packages/db/.env.',
    );
  }
  if (!isLocalDatabaseUrl(url)) {
    throw new Error('TEST_DATABASE_URL must point at localhost: the database tests wipe it.');
  }
  return url;
}

export function connectTestDb() {
  return createDb(testDatabaseUrl(), { max: 2 });
}

class Rollback extends Error {}

/** Runs `work` in a transaction that is always rolled back, so tests leave the seed untouched. */
export async function inRollback(db: Db, work: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
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
