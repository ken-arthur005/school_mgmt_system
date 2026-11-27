import { type Action, reachFor, type StaffRole } from '@school-mgmt/shared';

/** The signed-in staff member, loaded once per request by the auth plugin. */
export interface AuthUser {
  userId: string;
  schoolId: string;
  roles: StaffRole[];
  staffId: string | null;
  /** The school's current academic year; null before the first year starts. */
  academicYearId: string | null;
  /** This year's classes where they're form teacher (only loaded for class teachers). */
  formClassIds: string[];
  /** This year's classes where they teach a subject (only loaded for subject teachers). */
  taughtClassIds: string[];
}

/**
 * Which students an action reaches for this user:
 * - `all`: the whole school
 * - `limited`: students with an active enrolment this year in one of `classIds`, or boarding this
 *   year when `boarders` is true
 * - null: the action isn't allowed at all
 */
export type StudentReach =
  | { kind: 'all' }
  | { kind: 'limited'; academicYearId: string | null; classIds: string[]; boarders: boolean };

export function studentReach(user: AuthUser, action: Action): StudentReach | null {
  const reaches = reachFor(user.roles, action);
  if (reaches.length === 0) {
    return null;
  }
  if (reaches.includes('school')) {
    return { kind: 'all' };
  }
  const classIds = new Set<string>();
  if (reaches.includes('form_classes')) {
    user.formClassIds.forEach((id) => classIds.add(id));
  }
  if (reaches.includes('taught_classes')) {
    user.taughtClassIds.forEach((id) => classIds.add(id));
  }
  return {
    kind: 'limited',
    academicYearId: user.academicYearId,
    classIds: [...classIds].sort(),
    boarders: reaches.includes('boarders'),
  };
}
