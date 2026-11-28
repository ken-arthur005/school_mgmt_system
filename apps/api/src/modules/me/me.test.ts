import type { ClassListResponse, HomeSummary, Me } from '@school-mgmt/shared';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../../test/helpers';

let ctx: TestContext;
const tokens = { head: '', kofi: '', housemaster: '', developer: '' };

beforeAll(async () => {
  ctx = await startTestApp();
  const find = lookup(ctx.db);
  tokens.head = await signToken(await find.userWithOnlyRole('head'));
  tokens.kofi = await signToken(await find.staffUser('Kofi', 'Darkwa'));
  tokens.housemaster = await signToken(await find.userWithOnlyRole('housemaster'));
  tokens.developer = await signToken(await find.userWithOnlyRole('system_admin'));
});

afterAll(async () => {
  await ctx.close();
});

async function get<T>(url: string, token: string): Promise<T> {
  const res = await ctx.app.inject({ method: 'GET', url, headers: bearer(token) });
  expect(res.statusCode).toBe(200);
  return res.json();
}

describe('GET /me', () => {
  test('a class teacher: name, school and form class', async () => {
    const me = await get<Me>('/me', tokens.kofi);
    expect(me).toMatchObject({
      displayName: 'Kofi Darkwa',
      school: { name: 'Beverly Hills Academy' },
      academicYearName: '2026/2027',
      formClasses: [{ name: 'Basic 4A' }],
    });
    expect(me.roles).toContain('class_teacher');
  });

  test('a login with no staff record', async () => {
    const me = await get<Me>('/me', tokens.developer);
    expect(me).toMatchObject({ staffId: null, jobTitle: null, formClasses: [] });
  });
});

describe('classes and home counts', () => {
  test('the head sees all 24 classes and 917 students', async () => {
    const summary = await get<HomeSummary>('/home/summary', tokens.head);
    expect(summary).toEqual({ studentCount: 917, classCount: 24, myClasses: [] });
  });

  test('a class teacher counts their own class', async () => {
    const summary = await get<HomeSummary>('/home/summary', tokens.kofi);
    expect(summary).toMatchObject({
      studentCount: 35,
      classCount: 1,
      myClasses: [{ name: 'Basic 4A', studentCount: 35 }],
    });
    const { items } = await get<ClassListResponse>('/classes', tokens.kofi);
    expect(items).toMatchObject([
      { name: 'Basic 4A', formTeacherName: 'Kofi Darkwa', isMyFormClass: true },
    ]);
  });

  test('a housemaster sees the classes with boarders', async () => {
    const { items } = await get<ClassListResponse>('/classes', tokens.housemaster);
    expect(items).toMatchObject([{ name: 'JHS 3', studentCount: 65 }]);
  });

  test('no student access: no counts', async () => {
    expect(await get<HomeSummary>('/home/summary', tokens.developer)).toEqual({
      studentCount: null,
      classCount: null,
      myClasses: [],
    });
  });
});
