import { type Db, withActor } from '@school-mgmt/db';
import {
  GUARDIAN_CONTACT_FIELDS,
  type GuardianDetail,
  type GuardianEdit,
  type GuardianListQuery,
  type GuardianListResponse,
  tryNormalizeGhanaPhone,
} from '@school-mgmt/shared';
import { type AuthUser, studentReach } from '../../access';
import { forbidden, notFound } from '../../plugins/errors';
import * as repo from './repo';

const CONTACT_FIELDS: ReadonlySet<string> = new Set(GUARDIAN_CONTACT_FIELDS);

export async function listGuardians(
  db: Db,
  user: AuthUser,
  query: GuardianListQuery,
): Promise<GuardianListResponse> {
  const reach = studentReach(user, 'guardians.read');
  if (reach === null) throw forbidden();
  const phone = query.q === undefined ? null : tryNormalizeGhanaPhone(query.q);
  const { items, total } = await repo.listGuardians(db, {
    schoolId: user.schoolId,
    reach,
    query,
    phone,
  });
  return { items, total, page: query.page, pageSize: query.pageSize };
}

/** 404 when there's no such guardian in this school; 403 when out of reach. */
export async function getGuardian(db: Db, user: AuthUser, id: string): Promise<GuardianDetail> {
  const guardian = await repo.findGuardian(db, { schoolId: user.schoolId, id });
  if (guardian === null) throw notFound('We could not find this parent or guardian.');
  const reach = studentReach(user, 'guardians.read');
  if (reach === null || !(await repo.isGuardianInReach(db, { guardianId: id, reach }))) {
    throw forbidden('This parent or guardian is not linked to one of your classes.');
  }
  const children = await repo.listChildren(db, {
    schoolId: user.schoolId,
    guardianId: id,
    reach,
  });
  return {
    id: guardian.id,
    surname: guardian.surname,
    firstName: guardian.firstName,
    otherNames: guardian.otherNames,
    primaryPhone: guardian.primaryPhone,
    secondaryPhone: guardian.secondaryPhone,
    whatsappPhone: guardian.whatsappPhone,
    email: guardian.email,
    occupation: guardian.occupation,
    address: guardian.address,
    digitalAddress: guardian.digitalAddress,
    children,
  };
}

/**
 * `guardians.edit` may change any field; `guardians.edit_contact` (class teachers) only contact
 * details. Either way the guardian must be within the caller's reach.
 */
export async function editGuardian(
  db: Db,
  user: AuthUser,
  id: string,
  changes: GuardianEdit,
): Promise<GuardianDetail> {
  const guardian = await repo.findGuardian(db, { schoolId: user.schoolId, id });
  if (guardian === null) throw notFound('We could not find this parent or guardian.');

  const contactOnly = Object.keys(changes).every((field) => CONTACT_FIELDS.has(field));
  const fullEdit = await repo.isGuardianInReach(db, {
    guardianId: id,
    reach: studentReach(user, 'guardians.edit'),
  });
  if (!fullEdit) {
    const contactEdit = await repo.isGuardianInReach(db, {
      guardianId: id,
      reach: studentReach(user, 'guardians.edit_contact'),
    });
    if (!contactEdit) {
      throw forbidden('This parent or guardian is not linked to one of your classes.');
    }
    if (!contactOnly) {
      throw forbidden('You can only change contact details. Please ask the office to change names.');
    }
  }

  await withActor(db, { userId: user.userId }, (tx) =>
    repo.updateGuardian(tx, { schoolId: user.schoolId, id, changes }),
  );
  return getGuardian(db, user, id);
}
