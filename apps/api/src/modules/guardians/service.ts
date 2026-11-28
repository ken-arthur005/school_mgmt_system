import { withActor } from '@school-mgmt/db';
import {
  GUARDIAN_CONTACT_FIELDS,
  type GuardianDetail,
  type GuardianEdit,
  type GuardianListQuery,
  type GuardianListResponse,
  type GuardianSearch,
  tryNormalizeGhanaPhone,
} from '@school-mgmt/shared';
import { type AuthUser, studentReach } from '../../access';
import { forbidden, notFound } from '../../plugins/errors';
import { photoLinks, type Services } from '../../services';
import type { SearchText } from '../students/repo';
import * as repo from './repo';

const CONTACT_FIELDS: ReadonlySet<string> = new Set(GUARDIAN_CONTACT_FIELDS);

async function findGuardians(
  services: Services,
  user: AuthUser,
  query: GuardianListQuery,
  search: SearchText | null,
): Promise<GuardianListResponse> {
  const reach = studentReach(user, 'guardians.read');
  if (reach === null) throw forbidden();
  const { items, total } = await repo.listGuardians(services.db, {
    schoolId: user.schoolId,
    reach,
    query,
    search,
  });
  const link = await photoLinks(
    services,
    items.map((item) => item.photoPath),
  );
  return {
    items: items.map(({ photoPath, ...item }) => ({ ...item, photoUrl: link(photoPath) })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function listGuardians(services: Services, user: AuthUser, query: GuardianListQuery) {
  return findGuardians(services, user, query, null);
}

export function searchGuardians(services: Services, user: AuthUser, body: GuardianSearch) {
  const { q, ...query } = body;
  return findGuardians(services, user, query, { text: q, phone: tryNormalizeGhanaPhone(q) });
}

/** 404 when there's no such guardian in this school; 403 when out of reach. */
export async function getGuardian(
  services: Services,
  user: AuthUser,
  id: string,
): Promise<GuardianDetail> {
  const { db } = services;
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
    academicYearId: user.academicYearId,
  });
  const link = await photoLinks(services, [
    guardian.photoPath,
    ...children.map((child) => child.photoPath),
  ]);
  return {
    id: guardian.id,
    photoUrl: link(guardian.photoPath),
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
    children: children.map(({ photoPath, ...child }) => ({
      ...child,
      photoUrl: link(photoPath),
    })),
  };
}

/**
 * `guardians.edit` may change any field; `guardians.edit_contact` (class teachers) only contact
 * details. Either way the guardian must be within the caller's reach.
 */
export async function editGuardian(
  services: Services,
  user: AuthUser,
  id: string,
  changes: GuardianEdit,
): Promise<GuardianDetail> {
  const { db } = services;
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
      throw forbidden(
        'You can only change contact details. Please ask the office to change names.',
      );
    }
  }

  const newWhatsappNumber =
    changes.whatsappPhone !== undefined && changes.whatsappPhone !== guardian.whatsappPhone;
  await withActor(db, { userId: user.userId }, async (tx) => {
    await repo.updateGuardian(tx, { schoolId: user.schoolId, id, changes });
    if (newWhatsappNumber) {
      await repo.clearWhatsappConsent(tx, { schoolId: user.schoolId, guardianId: id });
    }
  });
  return getGuardian(services, user, id);
}
