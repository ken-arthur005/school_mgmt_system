import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { academicYears, terms } from '../schema';

/**
 * Query 10: the term a date falls in, or null during the holidays.
 * `date` is a school-day date (YYYY-MM-DD in Africa/Accra), not a timestamp.
 */
export async function getTermForDate(db: Db, params: { schoolId: string; date: string }) {
  const rows = await db
    .select({
      termId: terms.id,
      termNumber: terms.number,
      academicYearId: academicYears.id,
      academicYearName: academicYears.name,
      startsOn: terms.startsOn,
      endsOn: terms.endsOn,
      inMidTermBreak: sql<boolean>`coalesce(${params.date}::date BETWEEN ${terms.midTermBreakStartsOn} AND ${terms.midTermBreakEndsOn}, false)`,
    })
    .from(terms)
    .innerJoin(academicYears, eq(academicYears.id, terms.academicYearId))
    .where(
      and(
        eq(terms.schoolId, params.schoolId),
        lte(terms.startsOn, params.date),
        gte(terms.endsOn, params.date),
        isNull(terms.archivedAt),
        isNull(academicYears.archivedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The school's current academic year: the latest one that has started by `date` (a school-day
 * date, YYYY-MM-DD in Africa/Accra). During the holiday between two years this is still last
 * year, so teachers keep seeing their classes until the new year begins. Null before the first
 * year starts.
 */
export async function getCurrentAcademicYear(db: Db, params: { schoolId: string; date: string }) {
  const rows = await db
    .select({ id: academicYears.id, name: academicYears.name })
    .from(academicYears)
    .where(
      and(
        eq(academicYears.schoolId, params.schoolId),
        lte(academicYears.startsOn, params.date),
        isNull(academicYears.archivedAt),
      ),
    )
    .orderBy(desc(academicYears.startsOn))
    .limit(1);
  return rows[0] ?? null;
}
