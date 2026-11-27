import type { ErrorResponse, StudentDetail, StudentListResponse } from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../../test/helpers';

let ctx: TestContext;
let head: string;
let admin: string;
let adminUserId: string;
let bursar: string;
let kofi: string; // form teacher of Basic 4A
let kwesi: string; // teaches Maths and Science in Basic 5–6
let housemaster: string;
let find: ReturnType<typeof lookup>;

beforeAll(async () => {
  ctx = await startTestApp();
  find = lookup(ctx.db);
  adminUserId = await find.userWithOnlyRole('admin');
  head = await signToken(await find.userWithOnlyRole('head'));
  admin = await signToken(adminUserId);
  bursar = await signToken(await find.userWithOnlyRole('bursar'));
  kofi = await signToken(await find.staffUser('Kofi', 'Darkwa'));
  kwesi = await signToken(await find.staffUser('Kwesi', 'Anan'));
  housemaster = await signToken(await find.userWithOnlyRole('housemaster'));
});

afterAll(async () => {
  await ctx.close();
});

async function list(token: string, query = ''): Promise<StudentListResponse> {
  const res = await ctx.app.inject({
    method: 'GET',
    url: `/students${query}`,
    headers: bearer(token),
  });
  expect(res.statusCode).toBe(200);
  return res.json();
}

async function search(token: string, body: Record<string, unknown>): Promise<StudentListResponse> {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/students/search',
    headers: bearer(token),
    payload: body,
  });
  expect(res.statusCode).toBe(200);
  return res.json();
}

async function detail(token: string, id: string): Promise<StudentDetail> {
  const res = await ctx.app.inject({
    method: 'GET',
    url: `/students/${id}`,
    headers: bearer(token),
  });
  expect(res.statusCode).toBe(200);
  return res.json();
}

const names = (page: StudentListResponse) => page.items.map((s) => `${s.firstName} ${s.surname}`);

describe('GET /students: who sees whom', () => {
  test('a class teacher sees only their form class this year', async () => {
    const page = await list(kofi, '?pageSize=100');
    expect(page.total).toBeGreaterThan(0);
    expect(new Set(page.items.map((s) => s.className))).toEqual(new Set(['Basic 4A']));
    expect(names(page)).toEqual(expect.arrayContaining(['Kwame Asamoah', 'Yaw Sakyi']));
    // His own daughter is in KG 2A: as a teacher he doesn't see her.
    expect(names(page)).not.toContain('Abena Darkwa');
  });

  test('a subject teacher sees the classes they teach', async () => {
    const page = await list(kwesi, '?pageSize=100');
    expect(new Set(page.items.map((s) => s.className))).toEqual(
      new Set(['Basic 5A', 'Basic 5B', 'Basic 6A', 'Basic 6B']),
    );
    expect(page.total).toBeGreaterThan(page.items.length);
  });

  test('a housemaster sees boarders only', async () => {
    const page = await list(housemaster, '?pageSize=100');
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((s) => s.isBoarder)).toBe(true);
  });

  test('the head sees the whole school', async () => {
    const page = await list(head);
    expect(page.total).toBeGreaterThan(800);
    expect(page.items).toHaveLength(50);
  });
});

describe('GET /students: search, filters, pages', () => {
  test('by name, every word must match', async () => {
    expect(names(await search(head, { q: 'kwame asamoah' }))).toEqual(['Kwame Asamoah']);
  });

  test('by a guardian phone, typed the local way', async () => {
    const page = await search(head, { q: '024 400 0102' });
    expect(names(page).sort()).toEqual(['Ama Asamoah', 'Kwame Asamoah', 'Yaa Asamoah']);
  });

  test('a phone search by a class teacher stays inside their class', async () => {
    expect(names(await search(kofi, { q: '0244000102' }))).toEqual(['Kwame Asamoah']);
  });

  test('by admission number', async () => {
    const kwame = await detail(head, await find.student('Kwame', 'Asamoah'));
    const page = await search(head, { q: kwame.admissionNumber });
    expect(names(page)).toEqual(['Kwame Asamoah']);
  });

  test('current students by default; former ones on request', async () => {
    expect((await list(head, '?pageSize=100')).items.every((s) => s.status === 'active')).toBe(
      true,
    );
    const withdrawn = await list(head, '?status=withdrawn&pageSize=100');
    expect(withdrawn.total).toBeGreaterThan(0);
    expect(withdrawn.items.every((s) => s.status === 'withdrawn')).toBe(true);
    const all = await list(head, '?status=any');
    expect(all.total).toBeGreaterThan((await list(head)).total);
  });

  test('pages do not overlap', async () => {
    const first = await list(head, '?pageSize=5&page=1');
    const second = await list(head, '?pageSize=5&page=2');
    expect(second.items).toHaveLength(5);
    expect(second.total).toBe(first.total);
    const firstIds = new Set(first.items.map((s) => s.id));
    expect(second.items.some((s) => firstIds.has(s.id))).toBe(false);
  });
});

describe('GET /students/:id', () => {
  test('a class teacher sees guardians and medical notes for their class', async () => {
    const kwame = await detail(kofi, await find.student('Kwame', 'Asamoah'));
    expect(kwame.currentEnrolment).toMatchObject({
      className: 'Basic 4A',
      academicYearName: '2026/2027',
    });
    expect(kwame.guardians?.map((g) => g.firstName).sort()).toEqual(['Akosua', 'Kwabena']);
    expect(kwame.guardians?.[0]).toMatchObject({ firstName: 'Akosua', isMainContact: true });
    expect(kwame.medicalNotes).toBeInstanceOf(Array);
  });

  test('a subject teacher sees the student but not guardians or medical notes', async () => {
    const student = await detail(kwesi, await find.aStudentIn('Basic 5A'));
    expect(student).not.toHaveProperty('guardians');
    expect(student).not.toHaveProperty('medicalNotes');
  });

  test('the bursar sees guardians but not medical notes', async () => {
    const kwame = await detail(bursar, await find.student('Kwame', 'Asamoah'));
    expect(kwame.guardians).toBeDefined();
    expect(kwame).not.toHaveProperty('medicalNotes');
  });

  test('a housemaster sees a boarder with medical notes', async () => {
    const boarder = await detail(housemaster, await find.aBoarder());
    expect(boarder.currentEnrolment?.isBoarder).toBe(true);
    expect(boarder.medicalNotes).toBeInstanceOf(Array);
  });

  test.each([
    { who: 'class teacher', token: () => kofi, student: ['Abena', 'Darkwa'] },
    { who: 'class teacher', token: () => kofi, student: ['Ama', 'Asamoah'] },
    { who: 'subject teacher', token: () => kwesi, student: ['Kwame', 'Asamoah'] },
    { who: 'housemaster', token: () => housemaster, student: ['Ama', 'Asamoah'] },
  ] as const)('$who → $student: 403, the student exists but is not theirs', async (c) => {
    const id = await find.student(c.student[0], c.student[1]);
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/students/${id}`,
      headers: bearer(c.token()),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: { code: 'forbidden', message: 'This student is not in one of your classes.' },
    });
  });
});

describe('PATCH /students/:id', () => {
  test('the office corrects a record; the audit log names who did it', async () => {
    const id = await find.student('Yaw', 'Sakyi');
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/students/${id}`,
      headers: bearer(admin),
      payload: { nhisNumber: ' 12345678 ', otherNames: '' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ nhisNumber: '12345678', otherNames: null });

    const entries = await ctx.db.execute<{ actor: string; nhis: string }>(
      sql`select actor_user_id as actor, new_data ->> 'nhis_number' as nhis
          from audit_log where row_id = ${id} and operation = 'UPDATE'
          order by id desc limit 1`,
    );
    expect(entries[0]).toEqual({ actor: adminUserId, nhis: '12345678' });
  });

  test('date of birth must stay before admission', async () => {
    const id = await find.student('Yaw', 'Sakyi');
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/students/${id}`,
      headers: bearer(admin),
      payload: { dateOfBirth: '2030-01-01' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorResponse>().error.message).toMatch(/Date of birth must be before/);
  });
});
