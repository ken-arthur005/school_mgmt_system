import { type GuardianDetail, guardianEditSchema } from '@school-mgmt/shared';
import type { HTMLInputTypeAttribute } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, FormError, Input } from '@/components/ui/field';
import { errorMessage } from '@/lib/api';
import { payloadResolver } from '@/lib/form-resolver';
import { guardianChanges, type GuardianFormValues, guardianFormValues } from '../contact';
import { guardianCopy as copy } from '../copy';
import { useEditGuardian } from '../hooks';

type TextField = Exclude<keyof GuardianFormValues, 'whatsappFollows'>;

export function EditGuardianDialog({
  guardian,
  namesToo,
  onClose,
}: {
  guardian: GuardianDetail;
  /** The office may also correct names; class teachers change contact details only. */
  namesToo: boolean;
  onClose: () => void;
}) {
  const save = useEditGuardian(guardian.id);
  const initial = guardianFormValues(guardian);
  const { register, handleSubmit, formState, control } = useForm<GuardianFormValues>({
    defaultValues: initial,
    resolver: payloadResolver(guardianEditSchema, (values: GuardianFormValues) =>
      guardianChanges(values, guardian),
    ),
  });
  const { errors } = formState;
  const [values, follows] = useWatch({ control, name: ['primaryPhone', 'whatsappFollows'] });
  const sharedNumber = initial.whatsappFollows;
  const whatsappHidden = sharedNumber && follows;
  const draft = guardianChanges(
    { ...initial, primaryPhone: values, whatsappFollows: follows },
    guardian,
  );

  const submit = handleSubmit((entered) => {
    save.mutate(guardianChanges(entered, guardian), {
      onSuccess: () => {
        toast.success(copy.saved);
        onClose();
      },
    });
  });

  const text = (name: TextField, type: HTMLInputTypeAttribute = 'text') => (
    <Field label={copy.labels[name]} error={errors[name]?.message}>
      {(field) => <Input {...field} {...register(name)} type={type} autoComplete="off" />}
    </Field>
  );

  return (
    <Dialog onClose={onClose} title={namesToo ? copy.editAll : copy.editContact}>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        {namesToo && (
          <>
            {text('firstName')}
            {text('otherNames')}
            {text('surname')}
          </>
        )}
        {text('primaryPhone', 'tel')}
        {sharedNumber && <Checkbox label={copy.whatsappFollows} {...register('whatsappFollows')} />}
        {!whatsappHidden && text('whatsappPhone', 'tel')}
        {draft.whatsappPhone !== undefined && (
          <p className="text-sm text-muted-foreground">{copy.newWhatsapp}</p>
        )}
        {text('secondaryPhone', 'tel')}
        {text('email', 'email')}
        {text('occupation')}
        {text('address')}
        {text('digitalAddress')}
        <FormError
          message={
            save.error !== null
              ? errorMessage(save.error)
              : errors.root?.message === undefined
                ? undefined
                : copy.nothingChanged
          }
        />
        <Button type="submit" size="lg" busy={save.isPending}>
          {copy.save}
        </Button>
      </form>
    </Dialog>
  );
}
