import type { GuardianDetail, GuardianListResponse } from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../../test/helpers';

let ctx: TestContext;
let head: string;
let kofi: string; // form teacher of Basic 4A
let kofiUserId: string;
let housemaster: string;
let find: ReturnType<typeof lookup>;
let akosuaId: string; // mother of Ama (JHS 2), Kwame (Basic 4A) and Yaa (KG 1B)

beforeAll(async () => {
  ctx = await startTestApp();
  find = lookup(ctx.db);
  kofiUserId = await find.staffUser('Kofi', 'Darkwa');
  head = await signToken(await find.userWithOnlyRole('head'));
  kofi = await signToken(kofiUserId);
  housemaster = await signToken(await find.userWithOnlyRole('housemaster'));
  akosuaId = await find.guardian('Akosua', 'Asamoah');
});

afterAll(async () => {
  await ctx.close();
});

async function list(token: string, query = ''): Promise<GuardianListResponse> {
  const res = await ctx.app.inject({ method: 'GET', url: `/guardians${query}`, headers: bearer(token) });
  expect(res.statusCode).toBe(200);
  return res.json();
}

async function detail(token: string, id: string): Promise<GuardianDetail> {
  const res = await ctx.app.inject({ method: 'GET', url: `/guardians/${id}`, headers: bearer(token) });
  expect(res.statusCode).toBe(200);
  return res.json();
}

const names = (page: GuardianListResponse) => page.items.map((g) => `${g.firstName} ${g.surname}`);

describe('GET /guardians', () => {
  test('a class teacher sees the parents of their class only', async () => {
    const page = await list(kofi, '?pageSize=100');
    expect(names(page)).toEqual(expect.arrayContaining(['Akosua Asamoah', 'Kwabena Asamoah']));
    // The Kuffour children are in JHS 2 and Basic 1A.
    expect(names(page)).not.toContain('Efua Kuffour');
  });

  test('a housemaster sees boarders’ parents only', async () => {
    const page = await list(housemaster, '?q=Asamoah');
    expect(page.total).toBe(0);
  });

  test('search by phone in any format', async () => {
    expect(names(await list(head, '?q=%2B233%2024%20400%200102'))).toEqual(['Akosua Asamoah']);
    expect(names(await list(head, '?q=233244000102'))).toEqual(['Akosua Asamoah']);
  });

  test('search by name', async () => {
    expect(names(await list(head, '?q=asamoah')).sort()).toEqual(['Akosua Asamoah', 'Kwabena Asamoah']);
  });
});

describe('GET /guardians/:id', () => {
  test('the head sees all of a guardian’s children', async () => {
    const akosua = await detail(head, akosuaId);
    expect(akosua.children.map((c) => c.firstName).sort()).toEqual(['Ama', 'Kwame', 'Yaa']);
  });

  test('a class teacher sees only the children in their class', async () => {
    const akosua = await detail(kofi, akosuaId);
    expect(akosua.children.map((c) => c.firstName)).toEqual(['Kwame']);
  });

  test('a class teacher gets 403 for another class’s parent', async () => {
    const efua = await find.guardian('Efua', 'Kuffour');
    const res = await ctx.app.inject({ method: 'GET', url: `/guardians/${efua}`, headers: bearer(kofi) });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /guardians/:id', () => {
  test('a class teacher updates a contact detail; phones are stored as +233…', async () => {
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/guardians/${akosuaId}`,
      headers: bearer(kofi),
      payload: { secondaryPhone: '020 999 0000' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ secondaryPhone: '+233209990000' });

    const entries = await ctx.db.execute<{ actor: string }>(
      sql`select actor_user_id as actor from audit_log
          where row_id = ${akosuaId} and new_data ->> 'secondary_phone' = '+233209990000'
          order by id desc limit 1`,
    );
    expect(entries[0]?.actor).toBe(kofiUserId);
  });

  test('a class teacher may not change names', async () => {
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/guardians/${akosuaId}`,
      headers: bearer(kofi),
      payload: { surname: 'Mensah', occupation: 'Nurse' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/only change contact details/);
  });

  test('a class teacher may not edit another class’s parent', async () => {
    const efua = await find.guardian('Efua', 'Kuffour');
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/guardians/${efua}`,
      headers: bearer(kofi),
      payload: { occupation: 'Nurse' },
    });
    expect(res.statusCode).toBe(403);
  });

  test('the head may change names', async () => {
    const kwabena = await find.guardian('Kwabena', 'Asamoah');
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/guardians/${kwabena}`,
      headers: bearer(head),
      payload: { otherNames: 'Owusu' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ otherNames: 'Owusu' });
  });
});
