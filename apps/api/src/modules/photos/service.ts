import { type Tx, withActor } from '@school-mgmt/db';
import { type PhotoResponse, uuidv7 } from '@school-mgmt/shared';
import { type AuthUser, studentReach } from '../../access';
import { ApiError, badRequest, forbidden, notFound } from '../../plugins/errors';
import { photoLinks, type Services } from '../../services';
import * as guardians from '../guardians/repo';
import * as staff from '../staff/repo';
import { studentToChange } from '../students/service';
import * as repo from './repo';

export type PhotoKind = 'student' | 'guardian' | 'staff';
export type PhotoTarget = { kind: PhotoKind; id: string } | { kind: 'me' };

/** Every JPEG file starts with these three bytes. */
const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);

interface Owner {
  table: repo.PhotoTable;
  id: string;
}

/** Whose photo this is, after checking the caller may change it. */
async function ownerOf(services: Services, user: AuthUser, target: PhotoTarget): Promise<Owner> {
  const scope = { schoolId: user.schoolId };
  switch (target.kind) {
    case 'student':
      await studentToChange(services, user, target.id, 'photos.edit');
      return { table: 'students', id: target.id };
    case 'guardian': {
      const guardian = await guardians.findGuardian(services.db, { ...scope, id: target.id });
      if (guardian === null) throw notFound('We could not find this parent or guardian.');
      const allowed = await guardians.isGuardianInReach(services.db, {
        guardianId: target.id,
        reach: studentReach(user, 'photos.edit'),
      });
      if (!allowed) {
        throw forbidden('This parent or guardian is not linked to one of your classes.');
      }
      return { table: 'guardians', id: target.id };
    }
    case 'staff': {
      const member = await staff.findStaff(services.db, { ...scope, id: target.id });
      if (member === null) throw notFound('We could not find this member of staff.');
      return { table: 'staff', id: target.id };
    }
    case 'me':
      if (user.staffId === null) {
        throw notFound('Your login has no staff record, so it cannot have a photo.');
      }
      return { table: 'staff', id: user.staffId };
  }
}

async function save(services: Services, user: AuthUser, owner: Owner, path: string | null) {
  await withActor(services.db, { userId: user.userId }, (tx: Tx) =>
    repo.setPhotoPath(tx, { schoolId: user.schoolId, ...owner, path }),
  );
}

export async function setPhoto(
  services: Services,
  user: AuthUser,
  target: PhotoTarget,
  body: unknown,
): Promise<PhotoResponse> {
  const owner = await ownerOf(services, user, target);
  if (!Buffer.isBuffer(body) || !body.subarray(0, 3).equals(JPEG_START)) {
    throw badRequest('Please choose a photo (JPEG).');
  }
  // A new name every time: nothing is overwritten, and old links never show the new picture.
  const path = `${user.schoolId}/${owner.table}/${owner.id}/${uuidv7()}.jpg`;
  try {
    await services.photos.upload(path, body);
  } catch (error) {
    services.log.error({ err: error }, 'photo upload failed');
    throw new ApiError(502, 'storage_unavailable', 'The photo could not be saved. Try again.');
  }
  await save(services, user, owner, path);
  const link = await photoLinks(services, [path]);
  return { photoUrl: link(path) };
}

/** Takes the photo off the record. The file itself is kept, like every archived thing. */
export async function removePhoto(
  services: Services,
  user: AuthUser,
  target: PhotoTarget,
): Promise<PhotoResponse> {
  const owner = await ownerOf(services, user, target);
  await save(services, user, owner, null);
  return { photoUrl: null };
}
