import { expect, type Page, test } from '@playwright/test';

// Needs a seeded dev database and dev logins. Set in apps/api/.env:
//   E2E_TEACHER_EMAIL  Kofi Darkwa's login (form teacher of Basic 4A)
//   E2E_OFFICE_EMAIL   the front office login
// Both are printed by `pnpm auth:dev-logins`; the password is DEV_LOGIN_PASSWORD.
const { E2E_TEACHER_EMAIL, E2E_OFFICE_EMAIL, DEV_LOGIN_PASSWORD } = process.env;

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(DEV_LOGIN_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /^Good / })).toBeVisible();
}

/** Matches a name however many middle names sit inside it. */
const named = (name: string) => new RegExp(name.replace(' ', '.*'));

async function findStudent(page: Page, name: string) {
  await page.getByRole('link', { name: /Find a student/ }).click();
  await page.getByRole('searchbox').fill(name);
  await page
    .getByRole('link', { name: named(name) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: named(name) })).toBeVisible();
}

/** Nothing may scroll sideways on a phone. */
async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('a teacher signs in, finds a student and edits a guardian’s phone', async ({ page }) => {
  test.skip(!E2E_TEACHER_EMAIL || !DEV_LOGIN_PASSWORD, 'E2E logins are not set');
  await signIn(page, E2E_TEACHER_EMAIL ?? '');
  await expectNoSidewaysScroll(page);
  await findStudent(page, 'Kwame Asamoah');
  await expectNoSidewaysScroll(page);

  await page.getByRole('link', { name: /^Akosua Asamoah/ }).click();
  await page.getByRole('button', { name: /Edit contact details/ }).click();
  // A different number each run, so there is always something to save.
  const second = `020 ${String(Date.now()).slice(-7, -4)} ${String(Date.now()).slice(-4)}`;
  await page.getByLabel('Second phone').fill(second);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Changes saved')).toBeVisible();
  await expect(page.getByRole('link', { name: second })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: second })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test('the office adds a guardian and removes them again', async ({ page }) => {
  test.skip(!E2E_OFFICE_EMAIL || !DEV_LOGIN_PASSWORD, 'E2E logins are not set');
  await signIn(page, E2E_OFFICE_EMAIL ?? '');
  await findStudent(page, 'Kofi Kuffour');

  await page.getByRole('button', { name: 'Add guardian' }).click();
  await page.getByRole('searchbox', { name: /Find the parent/ }).fill('Kwabena Asamoah');
  await page.getByRole('button', { name: /Kwabena Asamoah/ }).click();
  await page.getByLabel('Relationship to the student').selectOption('uncle');
  await page.getByRole('button', { name: 'Add guardian' }).last().click();
  await expect(page.getByText('Guardian added')).toBeVisible();

  await page.getByRole('button', { name: /Change link: Kwabena Asamoah/ }).click();
  await page.getByRole('button', { name: 'Remove from this student' }).click();
  await expect(page.getByText('Guardian removed')).toBeVisible();
  await expect(page.getByRole('link', { name: /Kwabena Asamoah/ })).toHaveCount(0);
});

test('the office adds a brother or sister', async ({ page }) => {
  test.skip(!E2E_OFFICE_EMAIL || !DEV_LOGIN_PASSWORD, 'E2E logins are not set');
  await signIn(page, E2E_OFFICE_EMAIL ?? '');
  await findStudent(page, 'Esi Kuffour');
  const listed = page.getByRole('link', { name: named('Akua Dapaah') });
  // Already there from an earlier run: nothing to add.
  if ((await listed.count()) === 0) {
    await page.getByRole('button', { name: /Add brother or sister/ }).click();
    await page.getByRole('searchbox', { name: 'Find the student' }).fill('Akua Dapaah');
    await page.getByRole('button', { name: named('Akua Dapaah') }).click();
    await page.getByRole('button', { name: 'Add brother or sister', exact: true }).click();
  }
  await expect(listed).toBeVisible();
});
