import { can, formatGhanaPhone, type GuardianDetail, type Me } from '@school-mgmt/shared';
import { MessageCircle, Pencil, Phone } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge, Details, Panel } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { Loaded } from '@/components/states';
import { Button, buttonVariants } from '@/components/ui/button';
import { coversClass, useMe } from '@/features/me/hooks';
import { PhotoAvatar } from '@/features/photos/components/photo-avatar';
import { studentCopy } from '@/features/students/copy';
import { fullName, RELATIONSHIP_LABELS } from '@/lib/labels';
import { guardianCopy as copy } from '../copy';
import { useGuardian } from '../hooks';
import { EditGuardianDialog } from './edit-guardian-dialog';

/** What this user may do to this guardian. The API checks again. */
export function guardianRights(me: Me, guardian: GuardianDetail) {
  const covered = (action: 'guardians.edit_contact' | 'photos.edit') =>
    guardian.children.some((child) => coversClass(me, action, child.className));
  const editAll = can(me.roles, 'guardians.edit');
  return {
    editAll,
    editContact: editAll || covered('guardians.edit_contact'),
    photo: editAll || covered('photos.edit'),
  };
}

function Profile({ guardian, me }: { guardian: GuardianDetail; me: Me }) {
  const rights = guardianRights(me, guardian);
  const [editing, setEditing] = useState(false);
  const phone = (value: string | null) =>
    value === null ? null : (
      <a className="tabular-nums underline underline-offset-4" href={`tel:${value}`}>
        {formatGhanaPhone(value)}
      </a>
    );

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col items-center gap-4 rounded-xl bg-card p-5 text-center shadow-panel sm:flex-row sm:text-left">
        <PhotoAvatar
          firstName={guardian.firstName}
          surname={guardian.surname}
          photoUrl={guardian.photoUrl}
          path={rights.photo ? `/guardians/${guardian.id}/photo` : undefined}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold break-words sm:text-3xl">{fullName(guardian)}</h1>
          <p className="text-muted-foreground tabular-nums">
            {formatGhanaPhone(guardian.primaryPhone)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a href={`tel:${guardian.primaryPhone}`} className={buttonVariants()}>
            <Phone aria-hidden />
            {studentCopy.call}
          </a>
          <a
            href={`https://wa.me/${guardian.whatsappPhone.slice(1)}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'secondary' })}
          >
            <MessageCircle aria-hidden />
            WhatsApp
          </a>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title={copy.contact}
          action={
            rights.editContact && (
              <Button
                variant="secondary"
                className="print:hidden"
                onClick={() => {
                  setEditing(true);
                }}
              >
                <Pencil aria-hidden />
                {studentCopy.edit}
                <span className="sr-only"> contact details</span>
              </Button>
            )
          }
        >
          <Details
            items={[
              [copy.labels.primaryPhone, phone(guardian.primaryPhone)],
              [copy.labels.whatsappPhone, phone(guardian.whatsappPhone)],
              [copy.labels.secondaryPhone, phone(guardian.secondaryPhone)],
              [copy.labels.email, guardian.email],
              [copy.labels.occupation, guardian.occupation],
              [copy.labels.address, guardian.address],
              [copy.labels.digitalAddress, guardian.digitalAddress],
            ]}
          />
        </Panel>
        <Panel title={copy.children}>
          {guardian.children.length === 0 ? (
            <p className="text-muted-foreground">{copy.noChildren}</p>
          ) : (
            <ul>
              {guardian.children.map((child) => (
                <li key={child.linkId}>
                  <PersonLink
                    to="/students/$studentId"
                    params={{ studentId: child.studentId }}
                    firstName={child.firstName}
                    surname={child.surname}
                    photoUrl={child.photoUrl}
                    title={fullName(child)}
                    detail={[RELATIONSHIP_LABELS[child.relationship], child.className]
                      .filter(Boolean)
                      .join(' · ')}
                    badge={
                      child.isMainContact ? (
                        <Badge tone="gold">
                          Main<span className="sr-only"> contact</span>
                        </Badge>
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {editing && (
        <EditGuardianDialog
          guardian={guardian}
          namesToo={rights.editAll}
          onClose={() => {
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

export function GuardianScreen({ guardianId }: { guardianId: string }) {
  const guardian = useGuardian(guardianId);
  const me = useMe();
  return (
    <>
      <PageHeader back help={copy.help} />
      <Loaded query={guardian}>
        {(data) => me.data !== undefined && <Profile key={data.id} guardian={data} me={me.data} />}
      </Loaded>
    </>
  );
}
