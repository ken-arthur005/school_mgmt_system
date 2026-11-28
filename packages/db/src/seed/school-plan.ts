import type { ElectiveGroup, LevelStage } from '@school-mgmt/shared';

// The fixed shape of the seed school. Everything random lives in generate.ts.

export const SEED_SCHOOL = { name: 'Beverly Hills Academy', shortName: 'BHA' } as const;

export interface LevelPlan {
  code: string;
  name: string;
  stage: LevelStage;
  /** Stream letters, or [null] for a level with a single class. */
  streams: readonly (string | null)[];
  /** Typical age on 1 September of the year a child is in this level. */
  age: number;
}

const AB = ['A', 'B'] as const;
const SINGLE = [null] as const;

/** In school order. Index in this list = progression order. */
export const LEVELS: readonly LevelPlan[] = [
  { code: 'CRECHE', name: 'Creche', stage: 'creche', streams: SINGLE, age: 1 },
  { code: 'N1', name: 'Nursery 1', stage: 'nursery', streams: AB, age: 2 },
  { code: 'N2', name: 'Nursery 2', stage: 'nursery', streams: AB, age: 3 },
  { code: 'KG1', name: 'KG 1', stage: 'kindergarten', streams: AB, age: 4 },
  { code: 'KG2', name: 'KG 2', stage: 'kindergarten', streams: AB, age: 5 },
  { code: 'B1', name: 'Basic 1', stage: 'primary', streams: AB, age: 6 },
  { code: 'B2', name: 'Basic 2', stage: 'primary', streams: AB, age: 7 },
  { code: 'B3', name: 'Basic 3', stage: 'primary', streams: AB, age: 8 },
  { code: 'B4', name: 'Basic 4', stage: 'primary', streams: AB, age: 9 },
  { code: 'B5', name: 'Basic 5', stage: 'primary', streams: AB, age: 10 },
  { code: 'B6', name: 'Basic 6', stage: 'primary', streams: AB, age: 11 },
  { code: 'JHS1', name: 'JHS 1', stage: 'jhs', streams: SINGLE, age: 12 },
  { code: 'JHS2', name: 'JHS 2', stage: 'jhs', streams: SINGLE, age: 13 },
  { code: 'JHS3', name: 'JHS 3', stage: 'jhs', streams: SINGLE, age: 14 },
];

export function className(level: LevelPlan, stream: string | null): string {
  return stream === null ? level.name : `${level.name}${stream}`;
}

/** Current-year class sizes. Totals 917, the school's real roll. */
export function currentClassSize(level: LevelPlan): number {
  switch (level.code) {
    case 'CRECHE':
      return 20;
    case 'JHS1':
    case 'JHS2':
      return 66;
    case 'JHS3':
      return 65;
    default:
      return 35;
  }
}

/** Last year's JHS 3, who graduated in July 2026. */
export const GRADUATED_LAST_YEAR = 60;
export const WITHDRAWN_LAST_YEAR = 12;
export const TRANSFERRED_LAST_YEAR = 4;

export interface SubjectPlan {
  code: string;
  name: string;
  electiveGroup?: ElectiveGroup;
}

/** Standard GES subjects (KG learning areas, primary, JHS Common Core). */
export const SUBJECTS: readonly SubjectPlan[] = [
  { code: 'LIT', name: 'Literacy' },
  { code: 'NUM', name: 'Numeracy' },
  { code: 'CA', name: 'Creative Arts' },
  { code: 'OWOP', name: 'Our World Our People' },
  { code: 'ENG', name: 'English Language' },
  { code: 'MATH', name: 'Mathematics' },
  { code: 'SCI', name: 'Science' },
  { code: 'HIST', name: 'History' },
  { code: 'RME', name: 'Religious and Moral Education' },
  { code: 'COMP', name: 'Computing' },
  { code: 'PE', name: 'Physical Education' },
  { code: 'FRE', name: 'French' },
  { code: 'TWI', name: 'Ghanaian Language (Twi)', electiveGroup: 'ghanaian_language' },
  { code: 'DAG', name: 'Ghanaian Language (Dagaare)', electiveGroup: 'ghanaian_language' },
  { code: 'SOC', name: 'Social Studies' },
  { code: 'CTECH', name: 'Career Technology' },
  { code: 'CAD', name: 'Creative Arts and Design' },
  { code: 'PEH', name: 'Physical and Health Education' },
];

const EARLY_YEARS = ['LIT', 'NUM', 'CA', 'OWOP'] as const;
const PRIMARY = ['ENG', 'TWI', 'DAG', 'MATH', 'SCI', 'OWOP', 'HIST', 'CA', 'RME', 'COMP', 'PE'];
const JHS = [
  'ENG',
  'TWI',
  'DAG',
  'FRE',
  'MATH',
  'SCI',
  'SOC',
  'RME',
  'COMP',
  'CTECH',
  'CAD',
  'PEH',
];

/** Subjects each level takes. French starts at Basic 4; Ghanaian language at Basic 1. */
export function subjectCodesFor(level: LevelPlan): readonly string[] {
  switch (level.stage) {
    case 'creche':
      return [];
    case 'nursery':
    case 'kindergarten':
      return EARLY_YEARS;
    case 'primary':
      return ['B4', 'B5', 'B6'].includes(level.code) ? [...PRIMARY, 'FRE'] : PRIMARY;
    case 'jhs':
      return JHS;
  }
}

export interface TermPlan {
  number: number;
  startsOn: string;
  endsOn: string;
  midTermBreakStartsOn: string;
  midTermBreakEndsOn: string;
}

export interface YearPlan {
  name: string;
  startsOn: string;
  endsOn: string;
  terms: readonly TermPlan[];
}

const term = (number: number, dates: readonly [string, string, string, string]): TermPlan => ({
  number,
  startsOn: dates[0],
  endsOn: dates[1],
  midTermBreakStartsOn: dates[2],
  midTermBreakEndsOn: dates[3],
});

export const PREVIOUS_YEAR: YearPlan = {
  name: '2025/2026',
  startsOn: '2025-09-08',
  endsOn: '2026-07-24',
  terms: [
    term(1, ['2025-09-08', '2025-12-18', '2025-10-23', '2025-10-27']),
    term(2, ['2026-01-12', '2026-04-02', '2026-02-19', '2026-02-23']),
    term(3, ['2026-04-27', '2026-07-24', '2026-06-04', '2026-06-08']),
  ],
};

export const CURRENT_YEAR: YearPlan = {
  name: '2026/2027',
  startsOn: '2026-09-07',
  endsOn: '2027-07-23',
  terms: [
    term(1, ['2026-09-07', '2026-12-17', '2026-10-22', '2026-10-26']),
    term(2, ['2027-01-11', '2027-04-01', '2027-02-18', '2027-02-22']),
    term(3, ['2027-04-26', '2027-07-23', '2027-06-03', '2027-06-07']),
  ],
};
