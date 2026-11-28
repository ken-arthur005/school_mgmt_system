import { type StudentDetail, uuidv7 } from '@school-mgmt/shared';
import { Link } from '@tanstack/react-router';
import { Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Panel } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, FormError } from '@/components/ui/field';
import { useCan } from '@/features/me/hooks';
import { ApiError, errorMessage } from '@/lib/api';
import { fullName } from '@/lib/labels';
import { studentCopy as copy } from '../copy';
import { useAddSibling } from '../hooks';
import { type PickedStudent, StudentPicker } from './student-picker';

function AddSiblingDialog({ student, onClose }: { student: StudentDetail; onClose: () => void }) {
  const save = useAddSibling(student.id);
  const [picked, setPicked] = useState<PickedStudent>();
  const [linkGuardians, setLinkGuardians] = useState(false);
  const [newFamilyId] = useState(uuidv7);
  const otherFamily = save.error instanceof ApiError && save.error.code === 'in_other_family';

  const submit = (sibling: PickedStudent, move: boolean) => {
    save.mutate(
      { siblingId: sibling.id, newFamilyId, move, linkGuardians },
      {
        onSuccess: () => {
          toast.success(`${sibling.name} added to the family`);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      onClose={onClose}
      title={copy.addSibling}
      description={`Choose a brother or sister of ${fullName(student)}.`}
    >
      {picked === undefined ? (
        <StudentPicker
          exclude={[student.id, ...student.siblings.map((sibling) => sibling.studentId)]}
          onPick={setPicked}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-lg font-semibold">{picked.name}</p>
          {(student.guardians?.length ?? 0) > 0 && (
            <Checkbox
              label={`Also give them ${student.firstName}’s guardians`}
              hint="WhatsApp agreement is not copied."
              checked={linkGuardians}
              onChange={(event) => {
                setLinkGuardians(event.target.checked);
              }}
            />
          )}
          <FormError message={save.error === null ? undefined : errorMessage(save.error)} />
          <Button
            size="lg"
            busy={save.isPending}
            onClick={() => {
              submit(picked, otherFamily);
            }}
          >
            {otherFamily ? 'Move to this family' : copy.addSibling}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              save.reset();
              setPicked(undefined);
            }}
          >
            Choose someone else
          </Button>
        </div>
      )}
    </Dialog>
  );
}

export function Siblings({ student }: { student: StudentDetail }) {
  const mayManage = useCan('families.manage') && student.archivedAt === null;
  const seesFamilies = useCan('families.read');
  const [adding, setAdding] = useState(false);
  return (
    <Panel
      title={copy.family}
      action={
        mayManage && (
          <Button
            variant="secondary"
            className="print:hidden"
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            Add
            <span className="sr-only"> brother or sister</span>
          </Button>
        )
      }
    >
      {student.family !== null && (
        <p className="mb-1 font-medium text-muted-foreground">{student.family.name}</p>
      )}
      {student.siblings.length === 0 ? (
        <p className="text-muted-foreground">{copy.noSiblings}</p>
      ) : (
        <ul>
          {student.siblings.map((sibling) => (
            <li key={sibling.studentId}>
              <PersonLink
                to="/students/$studentId"
                params={{ studentId: sibling.studentId }}
                firstName={sibling.firstName}
                surname={sibling.surname}
                photoUrl={sibling.photoUrl}
                title={fullName(sibling)}
                detail={sibling.className ?? sibling.admissionNumber}
              />
            </li>
          ))}
        </ul>
      )}
      {seesFamilies && student.family !== null && (
        <Link
          to="/families/$familyId"
          params={{ familyId: student.family.id }}
          className={buttonVariants({ variant: 'outline', className: 'mt-3 w-full print:hidden' })}
        >
          <UsersRound aria-hidden />
          {copy.openFamily}
        </Link>
      )}
      {adding && (
        <AddSiblingDialog
          student={student}
          onClose={() => {
            setAdding(false);
          }}
        />
      )}
    </Panel>
  );
}
