import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
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
