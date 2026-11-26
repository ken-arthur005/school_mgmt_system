import type { EnrolmentStatus } from '@school-mgmt/shared';
import { inArray, isNull, type SQL, sql } from 'drizzle-orm';
import { enrolments } from '../schema';

/**
 * Enrolments that count towards a class's roll: this year's active pupils, and for past years
 * those who finished the year. Pupils who withdrew or transferred mid-year are left out.
 */
const ON_ROLL: readonly EnrolmentStatus[] = ['active', 'completed', 'graduated'];

export function onRoll(): SQL {
  return sql`(${inArray(enrolments.status, ON_ROLL)} AND ${isNull(enrolments.archivedAt)})`;
}
