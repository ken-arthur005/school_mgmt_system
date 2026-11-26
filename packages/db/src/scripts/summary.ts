import type { SeedData } from '../seed/generate';

/** Row counts only: never names or phone numbers in logs. */
export function summariseSeed(data: SeedData): string {
  const active = data.students.filter((student) => student.status === 'active').length;
  return [
    'Seeded the demo school:',
    `  students        ${data.students.length} (${active} enrolled this year)`,
    `  guardians       ${data.guardians.length}`,
    `  guardian links  ${data.studentGuardians.length}`,
    `  staff           ${data.staff.length}`,
    `  logins          ${data.users.length + 1}`,
    `  classes         ${data.classes.length} (two years)`,
    `  enrolments      ${data.enrolments.length}`,
  ].join('\n');
}
