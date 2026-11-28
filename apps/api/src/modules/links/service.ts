import { type Tx, withActor } from '@school-mgmt/db';
import type { GuardianLinkCreate, GuardianLinkEdit, StudentDetail } from '@school-mgmt/shared';
import type { AuthUser } from '../../access';
import { ApiError, notFound } from '../../plugins/errors';
import type { Services } from '../../services';
import { findGuardian } from '../guardians/repo';
import { getStudent, studentToChange } from '../students/service';
import * as repo from './repo';

const alreadyLinked = () =>
  new ApiError(409, 'already_linked', 'This guardian is already linked to this student.');
const idInUse = () =>
  new ApiError(409, 'id_in_use', 'This could not be saved. Please close the form and try again.');

/** The guardian to link: one on file, or a new one created in the same transaction. */
async function resolveGuardian(
  tx: Tx,
  user: AuthUser,
  guardian: GuardianLinkCreate['guardian'],
): Promise<string> {
  const { schoolId } = user;
  if (guardian.kind === 'existing') {
    const found = await findGuardian(tx, { schoolId, id: guardian.guardianId });
    if (found === null) throw notFound('We could not find this parent or guardian.');
    return found.id;
  }

  if (await repo.guardianIdTaken(tx, guardian.guardianId)) throw idInUse();
  const whatsappPhone = guardian.whatsappPhone ?? guardian.primaryPhone;
  if (!guardian.confirmNew) {
    const matches = await repo.listGuardiansByPhone(tx, {
      schoolId,
      phones: [guardian.primaryPhone, whatsappPhone],
    });
    if (matches.length > 0) {
      throw new ApiError(
        409,
        'possible_duplicate',
        'Someone with this phone number is already on file.',
        { matches: matches.map((match) => ({ ...match, photoUrl: null })) },
      );
    }
  }
  await repo.insertGuardian(tx, {
    id: guardian.guardianId,
    schoolId,
    createdBy: user.userId,
    surname: guardian.surname,
    firstName: guardian.firstName,
    otherNames: guardian.otherNames ?? null,
    primaryPhone: guardian.primaryPhone,
    whatsappPhone,
  });
  return guardian.guardianId;
}

export async function addLink(
  services: Services,
  user: AuthUser,
  studentId: string,
  body: GuardianLinkCreate,
  now: Date,
): Promise<StudentDetail> {
  await studentToChange(services, user, studentId, 'guardians.link');
  const { schoolId } = user;

  await withActor(services.db, { userId: user.userId }, async (tx) => {
    await repo.lockStudent(tx, studentId);
    const saved = await repo.findLink(tx, { schoolId, id: body.linkId });
    if (saved !== null) {
      // A retried save: the first attempt already worked.
      if (saved.studentId === studentId) return;
      throw idInUse();
    }

    const guardianId = await resolveGuardian(tx, user, body.guardian);
    const links = await repo.listActiveLinks(tx, { schoolId, studentId });
    if (links.some((link) => link.guardianId === guardianId)) throw alreadyLinked();

    const isMainContact = body.isMainContact || links.length === 0;
    if (isMainContact) await repo.clearMainContact(tx, { schoolId, studentId });
    await repo.insertLink(tx, {
      id: body.linkId,
      schoolId,
      createdBy: user.userId,
      studentId,
      guardianId,
      relationship: body.relationship,
      isMainContact,
      whatsappOptIn: body.whatsappOptIn,
      whatsappOptInAt: body.whatsappOptIn ? now : null,
    });
  });
  return getStudent(services, user, studentId);
}

/**
 * Runs `change` on a link with its student locked, after checking the caller may link guardians
 * to that student.
 */
async function changeLink(
  services: Services,
  user: AuthUser,
  linkId: string,
  change: (tx: Tx, link: NonNullable<Awaited<ReturnType<typeof repo.findLink>>>) => Promise<void>,
): Promise<StudentDetail> {
  const { schoolId } = user;
  const studentId = await services.db.transaction(async (tx) => {
    const link = await repo.findLink(tx, { schoolId, id: linkId });
    if (link === null) throw notFound('We could not find this link.');
    return link.studentId;
  });
  await studentToChange(services, user, studentId, 'guardians.link');

  await withActor(services.db, { userId: user.userId }, async (tx) => {
    await repo.lockStudent(tx, studentId);
    // Read again now the student is locked: it may have just changed.
    const link = await repo.findLink(tx, { schoolId, id: linkId });
    if (link === null) throw notFound('We could not find this link.');
    await change(tx, link);
  });
  return getStudent(services, user, studentId);
}

export function editLink(
  services: Services,
  user: AuthUser,
  linkId: string,
  body: GuardianLinkEdit,
  now: Date,
) {
  return changeLink(services, user, linkId, async (tx, link) => {
    if (link.archivedAt !== null) throw notFound('This guardian was removed from the student.');
    const { schoolId } = user;
    if (body.isMainContact && !link.isMainContact) {
      await repo.clearMainContact(tx, { schoolId, studentId: link.studentId });
    }
    const consentChanged =
      body.whatsappOptIn !== undefined && body.whatsappOptIn !== link.whatsappOptIn;
    await repo.updateLink(tx, {
      schoolId,
      id: linkId,
      changes: {
        ...body,
        ...(consentChanged ? { whatsappOptInAt: body.whatsappOptIn ? now : null } : {}),
      },
    });
  });
}

export function removeLink(services: Services, user: AuthUser, linkId: string, now: Date) {
  return changeLink(services, user, linkId, async (tx, link) => {
    if (link.archivedAt !== null) return;
    const { schoolId } = user;
    const links = await repo.listActiveLinks(tx, { schoolId, studentId: link.studentId });
    if (links.length === 1) {
      throw new ApiError(
        409,
        'last_guardian',
        'A student needs at least one guardian. Add another before removing this one.',
      );
    }
    if (link.isMainContact) {
      throw new ApiError(
        409,
        'main_contact',
        'Choose another main contact before removing this guardian.',
      );
    }
    await repo.updateLink(tx, { schoolId, id: linkId, changes: { archivedAt: now } });
  });
}

/** Undo for `removeLink`. */
export function restoreLink(services: Services, user: AuthUser, linkId: string) {
  return changeLink(services, user, linkId, async (tx, link) => {
    if (link.archivedAt === null) return;
    const { schoolId } = user;
    if ((await findGuardian(tx, { schoolId, id: link.guardianId })) === null) {
      throw notFound('We could not find this parent or guardian.');
    }
    const links = await repo.listActiveLinks(tx, { schoolId, studentId: link.studentId });
    if (links.some((other) => other.guardianId === link.guardianId)) throw alreadyLinked();
    await repo.updateLink(tx, {
      schoolId,
      id: linkId,
      changes: { archivedAt: null, isMainContact: links.length === 0 },
    });
  });
}
