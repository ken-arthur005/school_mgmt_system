import {
  formatGhanaPhone,
  type Relationship,
  RELATIONSHIPS,
  type StudentDetail,
  type StudentGuardianLink,
} from '@school-mgmt/shared';
import { Phone, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Panel } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, FormError, Select } from '@/components/ui/field';
import { useCan } from '@/features/me/hooks';
import { studentCopy } from '@/features/students/copy';
import { useEditGuardianLink, useRemoveGuardianLink } from '@/features/students/hooks';
import { errorMessage } from '@/lib/api';
import { fullName, RELATIONSHIP_LABELS } from '@/lib/labels';
import { guardianCopy } from '../copy';
import { AddGuardianDialog } from './add-guardian-dialog';

const copy = guardianCopy.link;

function LinkDialog({ link, onClose }: { link: StudentGuardianLink; onClose: () => void }) {
  const edit = useEditGuardianLink();
  const remove = useRemoveGuardianLink();
  const [relationship, setRelationship] = useState<Relationship>(link.relationship);
  const [main, setMain] = useState(link.isMainContact);
  const [consent, setConsent] = useState(link.whatsappOptIn);
  const error = edit.error ?? remove.error;

  const save = () => {
    edit.mutate(
      {
        linkId: link.linkId,
        changes: {
          relationship,
          whatsappOptIn: consent,
          ...(main && !link.isMainContact ? { isMainContact: true as const } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(studentCopy.saved);
          onClose();
        },
      },
    );
  };

  const unlink = () => {
    const { linkId } = link;
    remove.mutate(
      { linkId },
      {
        onSuccess: () => {
          toast(copy.removed, {
            action: {
              label: copy.undo,
              onClick: () =>
                void remove
                  .mutateAsync({ linkId, undo: true })
                  .then(() => toast.success(copy.restored))
                  .catch((problem: unknown) => toast.error(errorMessage(problem))),
            },
          });
          onClose();
        },
      },
    );
  };

  return (
    <Dialog onClose={onClose} title={copy.changeTitle} description={fullName(link)}>
      <Field label={copy.relationship}>
        {(field) => (
          <Select
            {...field}
            value={relationship}
            onChange={(event) => {
              setRelationship(event.target.value as Relationship);
            }}
          >
            {RELATIONSHIPS.map((option) => (
              <option key={option} value={option}>
                {RELATIONSHIP_LABELS[option]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Checkbox
        label={copy.main}
        hint={link.isMainContact ? 'To change it, choose another guardian instead.' : copy.mainHint}
        checked={main}
        disabled={link.isMainContact}
        onChange={(event) => {
          setMain(event.target.checked);
        }}
      />
      <Checkbox
        label={copy.consent}
        hint={copy.consentHint}
        checked={consent}
        onChange={(event) => {
          setConsent(event.target.checked);
        }}
      />
      <FormError message={error === null ? undefined : errorMessage(error)} />
      <Button size="lg" busy={edit.isPending} onClick={save}>
        {guardianCopy.save}
      </Button>
      <Button variant="outline" busy={remove.isPending} onClick={unlink}>
        {copy.remove}
      </Button>
    </Dialog>
  );
}

export function StudentGuardians({
  student,
  guardians,
}: {
  student: StudentDetail;
  guardians: readonly StudentGuardianLink[];
}) {
  const mayLink = useCan('guardians.link') && student.archivedAt === null;
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<StudentGuardianLink>();

  return (
    <Panel
      title={studentCopy.guardians}
      action={
        mayLink && (
          <Button
            variant="secondary"
            className="print:hidden"
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            Add
            <span className="sr-only"> guardian</span>
          </Button>
        )
      }
    >
      {guardians.length === 0 ? (
        <p className="text-muted-foreground">{studentCopy.noGuardians}</p>
      ) : (
        <>
          {!guardians.some((guardian) => guardian.isMainContact) && (
            <p className="mb-2 rounded-md bg-warning p-3 text-warning-foreground">
              {studentCopy.noMainContact}
            </p>
          )}
          <ul className="flex flex-col divide-y">
            {guardians.map((guardian) => (
              <li key={guardian.linkId} className="py-2 first:pt-0 last:pb-0">
                <PersonLink
                  to="/guardians/$guardianId"
                  params={{ guardianId: guardian.guardianId }}
                  firstName={guardian.firstName}
                  surname={guardian.surname}
                  photoUrl={guardian.photoUrl}
                  title={fullName(guardian)}
                  detail={`${RELATIONSHIP_LABELS[guardian.relationship]} · ${formatGhanaPhone(guardian.primaryPhone)}`}
                />
                <div className="flex flex-wrap items-center gap-2 pl-2">
                  {guardian.isMainContact && <Badge tone="gold">{studentCopy.mainContact}</Badge>}
                  <Badge tone={guardian.whatsappOptIn ? 'good' : 'plain'}>
                    {guardian.whatsappOptIn ? studentCopy.whatsappYes : studentCopy.whatsappNo}
                  </Badge>
                  <span className="ml-auto flex gap-1 print:hidden">
                    <a
                      href={`tel:${guardian.primaryPhone}`}
                      className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                      aria-label={`${studentCopy.call} ${fullName(guardian)}`}
                    >
                      <Phone aria-hidden />
                    </a>
                    {mayLink && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${studentCopy.manage}: ${fullName(guardian)}`}
                        onClick={() => {
                          setChanging(guardian);
                        }}
                      >
                        <Settings2 aria-hidden />
                      </Button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {adding && (
        <AddGuardianDialog
          student={student}
          onClose={() => {
            setAdding(false);
          }}
        />
      )}
      {changing !== undefined && (
        <LinkDialog
          link={changing}
          onClose={() => {
            setChanging(undefined);
          }}
        />
      )}
    </Panel>
  );
}
