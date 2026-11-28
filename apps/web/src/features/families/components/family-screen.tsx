import { zodResolver } from '@hookform/resolvers/zod';
import {
  type FamilyChild,
  type FamilyDetail,
  familyRenameSchema,
  formatGhanaPhone,
} from '@school-mgmt/shared';
import { Pencil, Plus, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Panel } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { Loaded } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Input } from '@/components/ui/field';
import { useCan } from '@/features/me/hooks';
import { type PickedStudent, StudentPicker } from '@/features/students/components/student-picker';
import { ApiError, errorMessage } from '@/lib/api';
import { fullName, RELATIONSHIP_LABELS } from '@/lib/labels';
import { familyCopy as copy } from '../copy';
import { useAddFamilyChild, useFamily, useRemoveFamilyChild, useRenameFamily } from '../hooks';

function RenameDialog({ family, onClose }: { family: FamilyDetail; onClose: () => void }) {
  const save = useRenameFamily(family.id);
  const { register, handleSubmit, formState } = useForm<z.input<typeof familyRenameSchema>>({
    resolver: zodResolver(familyRenameSchema),
    defaultValues: { name: family.name },
  });
  const submit = handleSubmit((change) => {
    save.mutate(change, {
      onSuccess: () => {
        toast.success(copy.saved);
        onClose();
      },
    });
  });
  return (
    <Dialog onClose={onClose} title={copy.rename}>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <Field label={copy.nameLabel} error={formState.errors.name?.message}>
          {(field) => <Input {...field} {...register('name')} maxLength={100} />}
        </Field>
        <FormError message={save.error === null ? undefined : errorMessage(save.error)} />
        <Button type="submit" size="lg" busy={save.isPending}>
          {copy.save}
        </Button>
      </form>
    </Dialog>
  );
}

function AddChildDialog({ family, onClose }: { family: FamilyDetail; onClose: () => void }) {
  const add = useAddFamilyChild(family.id);
  const [picked, setPicked] = useState<PickedStudent>();
  const elsewhere = add.error instanceof ApiError && add.error.code === 'in_other_family';
  return (
    <Dialog onClose={onClose} title={copy.addChild}>
      {picked === undefined ? (
        <StudentPicker exclude={family.children.map((c) => c.studentId)} onPick={setPicked} />
      ) : (
        <>
          <p className="text-lg font-semibold">{picked.name}</p>
          <FormError message={add.error === null ? undefined : errorMessage(add.error)} />
          <Button
            size="lg"
            busy={add.isPending}
            onClick={() => {
              add.mutate({ studentId: picked.id, move: elsewhere }, { onSuccess: onClose });
            }}
          >
            {elsewhere ? copy.move : copy.addChild}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              add.reset();
              setPicked(undefined);
            }}
          >
            {copy.chooseOther}
          </Button>
        </>
      )}
    </Dialog>
  );
}

function Family({ family }: { family: FamilyDetail }) {
  const mayManage = useCan('families.manage');
  const [dialog, setDialog] = useState<'rename' | 'add'>();
  const remove = useRemoveFamilyChild(family.id);
  const putBack = useAddFamilyChild(family.id);

  const removeChild = (child: FamilyChild) => {
    const { studentId } = child;
    remove.mutate(
      { studentId },
      {
        onSuccess: () =>
          toast(copy.removed(child.firstName), {
            action: {
              label: copy.undo,
              onClick: () =>
                void putBack
                  .mutateAsync({ studentId, move: false })
                  .then(() => toast.success(copy.restored))
                  .catch((error: unknown) => toast.error(errorMessage(error))),
            },
          }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <>
      <PageHeader
        title={family.name}
        back
        help={copy.help}
        actions={
          mayManage && (
            <Button
              variant="outline"
              onClick={() => {
                setDialog('rename');
              }}
            >
              <Pencil aria-hidden />
              {copy.rename}
            </Button>
          )
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title={copy.children}
          action={
            mayManage && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDialog('add');
                }}
              >
                <Plus aria-hidden />
                {copy.addChild}
              </Button>
            )
          }
        >
          {family.children.length === 0 ? (
            <p className="text-muted-foreground">{copy.noChildren}</p>
          ) : (
            <ul>
              {family.children.map((child) => (
                <li key={child.studentId} className="flex items-center gap-1">
                  <PersonLink
                    to="/students/$studentId"
                    params={{ studentId: child.studentId }}
                    firstName={child.firstName}
                    surname={child.surname}
                    photoUrl={child.photoUrl}
                    title={fullName(child)}
                    detail={child.className ?? child.admissionNumber}
                  />
                  {mayManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${copy.remove} ${fullName(child)}`}
                      disabled={remove.isPending}
                      onClick={() => {
                        removeChild(child);
                      }}
                    >
                      <UserMinus aria-hidden />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={copy.guardians}>
          {family.guardians.length === 0 ? (
            <p className="text-muted-foreground">{copy.noGuardians}</p>
          ) : (
            <ul className="divide-y">
              {family.guardians.map((guardian) => (
                <li key={guardian.guardianId} className="py-2 first:pt-0 last:pb-0">
                  <PersonLink
                    to="/guardians/$guardianId"
                    params={{ guardianId: guardian.guardianId }}
                    firstName={guardian.firstName}
                    surname={guardian.surname}
                    photoUrl={guardian.photoUrl}
                    title={fullName(guardian)}
                    detail={formatGhanaPhone(guardian.primaryPhone)}
                  />
                  <ul className="pl-17 text-sm text-muted-foreground">
                    {guardian.children.map((child) => (
                      <li key={child.studentId}>
                        {RELATIONSHIP_LABELS[child.relationship]} of {child.firstName}
                        {child.isMainContact && ` (${copy.main})`}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {dialog === 'rename' && (
        <RenameDialog
          family={family}
          onClose={() => {
            setDialog(undefined);
          }}
        />
      )}
      {dialog === 'add' && (
        <AddChildDialog
          family={family}
          onClose={() => {
            setDialog(undefined);
          }}
        />
      )}
    </>
  );
}

export function FamilyScreen({ familyId }: { familyId: string }) {
  const family = useFamily(familyId);
  return <Loaded query={family}>{(data) => <Family key={data.id} family={data} />}</Loaded>;
}
