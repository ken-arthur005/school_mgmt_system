import type { GuardianDetail } from '@school-mgmt/shared';
import { describe, expect, test } from 'vitest';
import { guardianChanges, guardianFormValues } from './contact';

const guardian: GuardianDetail = {
  id: '0190a0a0-0000-7000-8000-000000000001',
  surname: 'Asamoah',
  firstName: 'Akosua',
  otherNames: null,
  primaryPhone: '+233244000102',
  secondaryPhone: null,
  whatsappPhone: '+233244000102',
  email: null,
  occupation: 'Trader',
  address: null,
  digitalAddress: null,
  photoUrl: null,
  children: [],
};
const separate = { ...guardian, whatsappPhone: '+233200000000' };
const unchanged = guardianFormValues(guardian);

describe('guardianChanges', () => {
  test.each([
    { name: 'nothing touched', edit: {}, expected: {} },
    {
      name: 'the same number typed another way',
      edit: { primaryPhone: '+233244000102' },
      expected: {},
    },
    {
      name: 'a new main phone carries WhatsApp with it',
      edit: { primaryPhone: '020 111 2222' },
      expected: { primaryPhone: '020 111 2222', whatsappPhone: '020 111 2222' },
    },
    {
      name: 'unticked: WhatsApp keeps the old number',
      edit: { primaryPhone: '020 111 2222', whatsappFollows: false },
      expected: { primaryPhone: '020 111 2222' },
    },
    {
      name: 'only the changed field is sent',
      edit: { occupation: ' Nurse ' },
      expected: { occupation: 'Nurse' },
    },
    {
      name: 'clearing an optional field',
      edit: { occupation: '' },
      expected: { occupation: null },
    },
    {
      name: 'a required field left empty is sent empty, to be refused',
      edit: { surname: '' },
      expected: { surname: '' },
    },
  ])('$name', ({ edit, expected }) => {
    expect(guardianChanges({ ...unchanged, ...edit }, guardian)).toEqual(expected);
  });

  test('a separate WhatsApp number is left alone when the main phone changes', () => {
    const values = { ...guardianFormValues(separate), primaryPhone: '020 111 2222' };
    expect(guardianChanges(values, separate)).toEqual({ primaryPhone: '020 111 2222' });
  });
});
