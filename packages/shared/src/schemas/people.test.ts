import { describe, expect, test } from 'vitest';
import { guardianEditSchema, guardianListQuerySchema } from './guardians';
import { studentEditSchema, studentListQuerySchema } from './students';

describe('studentListQuerySchema', () => {
  test('defaults to active students, first page of 50', () => {
    expect(studentListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 50,
      status: 'active',
      includeArchived: false,
    });
  });

  test.each([
    { input: { q: '  ' }, expected: { q: undefined } },
    { input: { q: ' Kofi ' }, expected: { q: 'Kofi' } },
    { input: { page: '3', pageSize: '20' }, expected: { page: 3, pageSize: 20 } },
    { input: { includeArchived: 'true' }, expected: { includeArchived: true } },
    { input: { status: 'any' }, expected: { status: 'any' } },
  ])('parses $input', ({ input, expected }) => {
    expect(studentListQuerySchema.parse(input)).toMatchObject(expected);
  });

  test.each([
    { pageSize: '101' },
    { page: '0' },
    { status: 'expelled' },
    { classId: 'not-a-uuid' },
    { includeArchived: 'maybe' },
  ])('rejects %j', (input) => {
    expect(studentListQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('studentEditSchema', () => {
  test.each([
    { input: { surname: ' Mensah ' }, expected: { surname: 'Mensah' } },
    { input: { otherNames: '' }, expected: { otherNames: null } },
    { input: { ghanaCardNumber: 'gha-123456789-0' }, expected: { ghanaCardNumber: 'GHA-123456789-0' } },
    { input: { religion: null }, expected: { religion: null } },
    { input: { dateOfBirth: '2015-03-02' }, expected: { dateOfBirth: '2015-03-02' } },
  ])('accepts $input', ({ input, expected }) => {
    expect(studentEditSchema.parse(input)).toEqual(expected);
  });

  test.each([
    { name: 'empty body', input: {} },
    { name: 'blank surname', input: { surname: '  ' } },
    { name: 'bad Ghana Card', input: { ghanaCardNumber: '123' } },
    { name: 'bad date', input: { dateOfBirth: '02/03/2015' } },
    { name: 'admission number is not editable', input: { admissionNumber: '2026/0001' } },
    { name: 'status is not editable', input: { status: 'withdrawn' } },
  ])('rejects $name', ({ input }) => {
    expect(studentEditSchema.safeParse(input).success).toBe(false);
  });
});

describe('guardianEditSchema', () => {
  test.each([
    { input: { primaryPhone: '024 123 4567' }, expected: { primaryPhone: '+233241234567' } },
    { input: { secondaryPhone: null }, expected: { secondaryPhone: null } },
    { input: { email: '' }, expected: { email: null } },
    { input: { email: 'ama@example.com' }, expected: { email: 'ama@example.com' } },
    { input: { digitalAddress: 'ga-183-8164' }, expected: { digitalAddress: 'GA-183-8164' } },
  ])('accepts $input', ({ input, expected }) => {
    expect(guardianEditSchema.parse(input)).toEqual(expected);
  });

  test.each([
    { name: 'empty body', input: {} },
    { name: 'bad phone', input: { primaryPhone: '12345' } },
    { name: 'primary phone cannot be cleared', input: { primaryPhone: null } },
    { name: 'bad email', input: { email: 'not-an-email' } },
    { name: 'bad digital address', input: { digitalAddress: 'Accra' } },
    { name: 'unknown field', input: { userId: '0190a0a0-0000-7000-8000-000000000000' } },
  ])('rejects $name', ({ input }) => {
    expect(guardianEditSchema.safeParse(input).success).toBe(false);
  });
});

describe('guardianListQuerySchema', () => {
  test('defaults', () => {
    expect(guardianListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 50 });
  });
});
