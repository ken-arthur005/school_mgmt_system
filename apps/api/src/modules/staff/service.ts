import type { StaffDetail, StaffListResponse } from '@school-mgmt/shared';
import type { AuthUser } from '../../access';
import { notFound } from '../../plugins/errors';
import { photoLinks, type Services } from '../../services';
import * as repo from './repo';

export async function listStaff(services: Services, user: AuthUser): Promise<StaffListResponse> {
  const rows = await repo.listStaff(services.db, { schoolId: user.schoolId });
  const link = await photoLinks(
    services,
    rows.map((row) => row.photoPath),
  );
  return { items: rows.map(({ photoPath, ...row }) => ({ ...row, photoUrl: link(photoPath) })) };
}

export async function getStaff(
  services: Services,
  user: AuthUser,
  id: string,
): Promise<StaffDetail> {
  const member = await repo.findStaff(services.db, { schoolId: user.schoolId, id });
  if (member === null) throw notFound('We could not find this member of staff.');
  const link = await photoLinks(services, [member.photoPath]);
  return {
    id: member.id,
    surname: member.surname,
    firstName: member.firstName,
    otherNames: member.otherNames,
    jobTitle: member.jobTitle,
    employmentType: member.employmentType,
    phone: member.phone,
    email: member.email,
    photoUrl: link(member.photoPath),
  };
}
