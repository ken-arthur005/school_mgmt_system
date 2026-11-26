import type { EmploymentType, Sex, StaffRole } from '@school-mgmt/shared';
import type { FixtureStaffKey } from './fixtures';
import { LEVELS, type LevelPlan } from './school-plan';

// The seed school's 54 staff (50 full-time, 4 part-time) and who teaches what.

export interface StaffPost {
  key: string;
  jobTitle: string;
  employmentType: EmploymentType;
  /** Non-teaching roles. class_teacher / subject_teacher are worked out from the timetable. */
  roles: readonly StaffRole[];
  hasLogin: boolean;
  sex?: Sex;
  fixture?: FixtureStaffKey;
}

const FULL: EmploymentType = 'full_time';
const PART: EmploymentType = 'part_time';

/** Key of the post that is form teacher of a class. */
export function formTeacherPostKey(level: LevelPlan, stream: string | null): string {
  switch (level.code) {
    case 'CRECHE':
      return 'creche';
    case 'JHS1':
      return 'jhs-eng';
    case 'JHS2':
      return 'jhs-math';
    case 'JHS3':
      return 'jhs-sci';
    default:
      return `form-${level.code}${stream ?? ''}`;
  }
}

const JHS_SUBJECT_TEACHERS: Readonly<Record<string, string>> = {
  ENG: 'jhs-eng',
  MATH: 'jhs-math',
  SCI: 'jhs-sci',
  SOC: 'jhs-soc',
  RME: 'jhs-rme',
  COMP: 'jhs-comp',
  CTECH: 'jhs-ctech',
  CAD: 'jhs-cad',
  PEH: 'jhs-peh',
};

/**
 * Who teaches a subject in a class. Nursery to Basic 4: the form teacher teaches everything
 * except the language specialists' subjects. Basic 5–6: a specialist takes Maths and Science.
 * JHS: subject specialists only.
 */
export function teacherPostKey(
  level: LevelPlan,
  stream: string | null,
  subjectCode: string,
): string {
  if (subjectCode === 'TWI') return 'twi';
  if (subjectCode === 'DAG') return 'dagaare';
  if (subjectCode === 'FRE') return 'french';
  if (level.stage === 'jhs') {
    const key = JHS_SUBJECT_TEACHERS[subjectCode];
    if (key === undefined) {
      throw new Error(`No JHS teacher planned for subject ${subjectCode}`);
    }
    return key;
  }
  if (
    (level.code === 'B5' || level.code === 'B6') &&
    (subjectCode === 'MATH' || subjectCode === 'SCI')
  ) {
    return 'upper-math-sci';
  }
  return formTeacherPostKey(level, stream);
}

const classTeacherPosts: StaffPost[] = LEVELS.filter(
  (level) => level.stage !== 'creche' && level.stage !== 'jhs',
).flatMap((level) =>
  level.streams.map((stream) => {
    const key = formTeacherPostKey(level, stream);
    return key === 'form-B4A'
      ? {
          key,
          jobTitle: 'Class Teacher',
          employmentType: FULL,
          roles: [],
          hasLogin: true,
          fixture: 'kofiDarkwa' as const,
        }
      : { key, jobTitle: 'Class Teacher', employmentType: FULL, roles: [], hasLogin: true };
  }),
);

const repeatPost = (key: string, jobTitle: string, count: number): StaffPost[] =>
  Array.from({ length: count }, (_, i) => ({
    key: `${key}-${i + 1}`,
    jobTitle,
    employmentType: FULL,
    roles: [],
    hasLogin: false,
  }));

export const STAFF_POSTS: readonly StaffPost[] = [
  {
    key: 'owner',
    jobTitle: 'Proprietress',
    employmentType: FULL,
    roles: ['owner'],
    hasLogin: true,
    sex: 'female',
  },
  { key: 'head', jobTitle: 'Head Teacher', employmentType: FULL, roles: ['head'], hasLogin: true },
  {
    key: 'admin',
    jobTitle: 'Administrator',
    employmentType: FULL,
    roles: ['admin'],
    hasLogin: true,
  },
  { key: 'bursar', jobTitle: 'Bursar', employmentType: FULL, roles: ['bursar'], hasLogin: true },
  {
    key: 'housemaster',
    jobTitle: 'Housemaster',
    employmentType: FULL,
    roles: ['housemaster'],
    hasLogin: true,
    sex: 'male',
  },
  {
    key: 'matron',
    jobTitle: 'Matron',
    employmentType: FULL,
    roles: ['housemaster'],
    hasLogin: true,
    sex: 'female',
  },
  {
    key: 'creche',
    jobTitle: 'Creche Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
    sex: 'female',
  },
  ...classTeacherPosts,
  {
    key: 'upper-math-sci',
    jobTitle: 'Mathematics and Science Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
    fixture: 'kwesiAnan',
  },
  {
    key: 'twi',
    jobTitle: 'Twi Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
    fixture: 'adwoaSakyi',
  },
  { key: 'dagaare', jobTitle: 'Dagaare Teacher', employmentType: PART, roles: [], hasLogin: true },
  { key: 'french', jobTitle: 'French Teacher', employmentType: PART, roles: [], hasLogin: true },
  { key: 'jhs-eng', jobTitle: 'English Teacher', employmentType: FULL, roles: [], hasLogin: true },
  {
    key: 'jhs-math',
    jobTitle: 'Mathematics Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
  },
  { key: 'jhs-sci', jobTitle: 'Science Teacher', employmentType: FULL, roles: [], hasLogin: true },
  {
    key: 'jhs-soc',
    jobTitle: 'Social Studies Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
  },
  { key: 'jhs-rme', jobTitle: 'RME Teacher', employmentType: FULL, roles: [], hasLogin: true },
  {
    key: 'jhs-comp',
    jobTitle: 'Computing Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
  },
  {
    key: 'jhs-ctech',
    jobTitle: 'Career Technology Teacher',
    employmentType: FULL,
    roles: [],
    hasLogin: true,
  },
  {
    key: 'jhs-cad',
    jobTitle: 'Creative Arts and Design Teacher',
    employmentType: PART,
    roles: [],
    hasLogin: true,
  },
  {
    key: 'jhs-peh',
    jobTitle: 'PE and Health Teacher',
    employmentType: PART,
    roles: [],
    hasLogin: true,
  },
  ...repeatPost('assistant', 'Teaching Assistant', 2),
  ...repeatPost('cook', 'Cook', 4),
  ...repeatPost('cleaner', 'Cleaner', 4),
  ...repeatPost('security', 'Security', 3),
  ...repeatPost('storekeeper', 'Storekeeper', 1),
];
