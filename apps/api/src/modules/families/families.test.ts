import {
  type FamilyDetail,
  type FamilyListResponse,
  type StudentDetail,
  uuidv7,
} from '@school-mgmt/shared';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../../test/helpers';

// The tests build on each other, in order.

let ctx: TestContext;
let head: string;
let kofi: string; // form teacher of Basic 4A
let find: ReturnType<typeof lookup>;

beforeAll(async () => {
  ctx = await startTestApp();
  find = lookup(ctx.db);
  head = await signToken(await find.userWithOnlyRole('head'));
  kofi = await signToken(await find.staffUser('Kofi', 'Darkwa'));
});

afterAll(async () => {
  await ctx.close();
});

async function get<T>(url: string, token = head): Promise<T> {
  const res = await ctx.app.inject({ method: 'GET', url, headers: bearer(token) });
  expect(res.statusCode).toBe(200);
  return res.json();
}

function post(url: string, payload?: Record<string, unknown>) {
  return ctx.app.inject({
    method: 'POST',
    url,
    headers: bearer(head),
    ...(payload === undefined ? {} : { payload }),
  });
}

const firstNames = (children: readonly { firstName: string }[]) =>
  children.map((child) => child.firstName).sort();

describe('families and brothers and sisters', () => {
  test('a guardian looking after another family’s child does not make them siblings', async () => {
    const nana = await get<StudentDetail>(`/students/${await find.student('Nana', 'Wiredu')}`);
    expect(nana.family?.name).toBe('Wiredu family');
    expect(firstNames(nana.siblings)).toEqual(['Adjoa']);

    const family = await get<FamilyDetail>(`/families/${await find.family('Nkansah family')}`);
    expect(firstNames(family.children)).toEqual(['Kobby']);
    expect(family.guardians.map((g) => g.firstName).sort()).toEqual(['Comfort', 'Yaw']);
  });

  test('a teacher sees only the brothers and sisters in their own classes', async () => {
    const id = await find.student('Kwame', 'Asamoah');
    expect((await get<StudentDetail>(`/students/${id}`, kofi)).siblings).toEqual([]);
    expect(firstNames((await get<StudentDetail>(`/students/${id}`)).siblings)).toEqual([
      'Ama',
      'Yaa',
    ]);
  });

  test('search by a child’s name', async () => {
    const res = await post('/families/search', { q: 'esi kuffour' });
    expect(res.json<FamilyListResponse>().items.map((f) => f.name)).toEqual(['Kuffour family']);
  });

  test('adding a sibling when neither has a family creates one, once', async () => {
    // Neither Abena Darkwa nor Yaw Sakyi starts with a family.
    const abena = await find.student('Abena', 'Darkwa');
    const yaw = await find.student('Yaw', 'Sakyi');
    const body = { siblingId: yaw, newFamilyId: uuidv7(), linkGuardians: true };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await post(`/students/${abena}/siblings`, body);
      expect(res.statusCode).toBe(200);
      expect(res.json<StudentDetail>().family).toEqual({
        id: body.newFamilyId,
        name: 'Darkwa family',
      });
    }
    // He keeps his own main contact and gains hers, without her WhatsApp agreement.
    const after = await get<StudentDetail>(`/students/${yaw}`);
    expect(after.guardians).toMatchObject([
      { firstName: 'Adwoa', isMainContact: true },
      { firstName: 'Kofi', isMainContact: false, whatsappOptIn: false },
    ]);
  });

  test('a child in another family is only moved when asked', async () => {
    const esi = await find.student('Esi', 'Kuffour');
    const asamoah = await find.family('Asamoah family');
    const kuffour = await find.family('Kuffour family');

    const refused = await post(`/families/${asamoah}/students`, { studentId: esi });
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ error: { code: 'in_other_family' } });

    const moved = await post(`/families/${asamoah}/students`, { studentId: esi, move: true });
    expect(firstNames(moved.json<FamilyDetail>().children)).toContain('Esi');
    expect(firstNames((await get<FamilyDetail>(`/families/${kuffour}`)).children)).toEqual([
      'Kofi',
    ]);

    const removed = await post(`/families/${asamoah}/students/${esi}/remove`);
    expect(firstNames(removed.json<FamilyDetail>().children)).not.toContain('Esi');
  });

  test('a new family is named after the first child', async () => {
    const adjoa = await find.student('Adjoa', 'Wiredu');
    const res = await post('/families', { id: uuidv7(), studentIds: [adjoa], move: true });
    expect(res.json<FamilyDetail>()).toMatchObject({ name: 'Wiredu family' });
  });
});
