import type { HomeSummary, Me, StaffRole } from '@school-mgmt/shared';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { greetingFor, HomeTasks } from './home-screen';

const me = (roles: StaffRole[]): Me => ({
  userId: '0190a0a0-0000-7000-8000-000000000001',
  displayName: 'Test Person',
  roles,
  school: { name: 'Beverly Hills Academy', shortName: 'BHA' },
  staffId: null,
  jobTitle: null,
  photoUrl: null,
  academicYearName: '2026/2027',
  formClasses: [],
  taughtClasses: [],
});

const NO_CLASS: HomeSummary = { studentCount: 917, classCount: 24, myClasses: [] };
const TEACHER: HomeSummary = {
  studentCount: 35,
  classCount: 1,
  myClasses: [{ id: '0190a0a0-0000-7000-8000-000000000002', name: 'Basic 4A', studentCount: 35 }],
};

async function show(roles: StaffRole[], summary: HomeSummary) {
  const root = createRootRoute({ component: () => <HomeTasks me={me(roles)} summary={summary} /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory() });
  await router.load();
  render(<RouterProvider router={router} />);
}

const buttons = () =>
  screen.queryAllByRole('link').map((link) => link.querySelector('.text-lg')?.textContent ?? '');

describe('home tasks', () => {
  test('a class teacher: their class first, then search and classes', async () => {
    await show(['class_teacher'], TEACHER);
    expect(await screen.findByText('Basic 4A')).toBeInTheDocument();
    expect(buttons().slice(1)).toEqual(['Find a student', 'Find a parent', 'Classes']);
  });

  test.each<{ roles: StaffRole[]; expected: string[] }>([
    { roles: ['subject_teacher'], expected: ['Find a student', 'Classes'] },
    {
      roles: ['bursar'],
      expected: ['Find a student', 'Find a parent', 'Classes', 'Families'],
    },
    {
      roles: ['admin'],
      expected: ['Find a student', 'Find a parent', 'Classes', 'Families', 'Staff'],
    },
  ])('$roles → $expected', async ({ roles, expected }) => {
    await show(roles, NO_CLASS);
    await screen.findByText('Find a student');
    expect(buttons()).toEqual(expected);
  });

  test('a login with no student access gets a plain empty home', async () => {
    await show(['system_admin'], { studentCount: null, classCount: null, myClasses: [] });
    expect(await screen.findByText(/nothing here for your login/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  test.each([
    [6, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good evening'],
  ])('at %i:00 → %s', (hour, greeting) => {
    expect(greetingFor(hour)).toBe(greeting);
  });
});
