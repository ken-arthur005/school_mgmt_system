import { RELIGIONS, SEXES, type StudentDetail, studentEditSchema } from '@school-mgmt/shared';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Input, Select } from '@/components/ui/field';
import { errorMessage } from '@/lib/api';
import { payloadResolver } from '@/lib/form-resolver';
import { RELIGION_LABELS, SEX_LABELS } from '@/lib/labels';
import { studentCopy as copy } from '../copy';
import { useEditStudent } from '../hooks';

interface Values {
  surname: string;
  firstName: string;
  otherNames: string;
  sex: string;
  dateOfBirth: string;
  religion: string;
  ghanaCardNumber: string;
  nhisNumber: string;
}

const valuesOf = (student: StudentDetail): Values => ({
  surname: student.surname,
  firstName: student.firstName,
  otherNames: student.otherNames ?? '',
  sex: student.sex,
  dateOfBirth: student.dateOfBirth,
  religion: student.religion ?? '',
  ghanaCardNumber: student.ghanaCardNumber ?? '',
  nhisNumber: student.nhisNumber ?? '',
});

const CLEARABLE: readonly (keyof Values)[] = [
  'otherNames',
  'religion',
  'ghanaCardNumber',
  'nhisNumber',
];

/** Only the changed fields, with an emptied optional box sent as "no value". */
export function studentChanges(
  values: Values,
  student: StudentDetail,
): z.input<typeof studentEditSchema> {
  const before = valuesOf(student);
  const changed = (Object.keys(before) as (keyof Values)[])
    .filter((field) => values[field].trim() !== before[field])
    .map((field) => {
      const value = values[field].trim();
      return [field, value === '' && CLEARABLE.includes(field) ? null : value];
    });
  return Object.fromEntries(changed) as z.input<typeof studentEditSchema>;
}

export function EditStudentDialog({
  student,
  onClose,
}: {
  student: StudentDetail;
  onClose: () => void;
}) {
  const save = useEditStudent(student.id);
  const { register, handleSubmit, formState } = useForm<Values>({
    defaultValues: valuesOf(student),
    resolver: payloadResolver(studentEditSchema, (values: Values) =>
      studentChanges(values, student),
    ),
  });
  const { errors } = formState;

  const submit = handleSubmit((values) => {
    save.mutate(studentChanges(values, student), {
      onSuccess: () => {
        toast.success(copy.saved);
        onClose();
      },
    });
  });

  const text = (name: Exclude<keyof Values, 'sex' | 'religion'>, type = 'text') => (
    <Field label={copy.labels[name]} error={errors[name]?.message}>
      {(field) => <Input {...field} {...register(name)} type={type} autoComplete="off" />}
    </Field>
  );

  return (
    <Dialog onClose={onClose} title={copy.editTitle}>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        {text('firstName')}
        {text('otherNames')}
        {text('surname')}
        <Field label={copy.labels.sex} error={errors.sex?.message}>
          {(field) => (
            <Select {...field} {...register('sex')}>
              {SEXES.map((sex) => (
                <option key={sex} value={sex}>
                  {SEX_LABELS[sex]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {text('dateOfBirth', 'date')}
        <Field label={copy.labels.religion} error={errors.religion?.message}>
          {(field) => (
            <Select {...field} {...register('religion')}>
              <option value="">{copy.noReligion}</option>
              {RELIGIONS.map((religion) => (
                <option key={religion} value={religion}>
                  {RELIGION_LABELS[religion]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {text('ghanaCardNumber')}
        {text('nhisNumber')}
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
