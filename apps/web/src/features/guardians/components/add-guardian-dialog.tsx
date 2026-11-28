import {
  formatGhanaPhone,
  type GuardianSummary,
  guardianLinkCreateSchema,
  possibleDuplicateSchema,
  type Relationship,
  RELATIONSHIPS,
  type StudentDetail,
  uuidv7,
} from '@school-mgmt/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PersonButton } from '@/components/person';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/field';
import { useAddGuardianLink } from '@/features/students/hooks';
import { ApiError, errorMessage } from '@/lib/api';
import { payloadResolver } from '@/lib/form-resolver';
import { fullName, RELATIONSHIP_LABELS } from '@/lib/labels';
import { useDebounced } from '@/lib/use-debounced';
import { cn } from '@/lib/utils';
import { guardianCopy } from '../copy';
import { useGuardianSearch } from '../hooks';

const copy = guardianCopy.link;

interface Values {
  relationship: Relationship;
  isMainContact: boolean;
  whatsappOptIn: boolean;
  surname: string;
  firstName: string;
  primaryPhone: string;
  whatsappPhone: string;
}

type Who = { kind: 'existing'; guardian: GuardianSummary } | { kind: 'new' };

interface Ids {
  linkId: string;
  guardianId: string;
}

function linkRequest(values: Values, who: Who, ids: Ids, confirmNew: boolean) {
  const { relationship, isMainContact, whatsappOptIn } = values;
  return {
    linkId: ids.linkId,
    relationship,
    isMainContact,
    whatsappOptIn,
    guardian:
      who.kind === 'existing'
        ? { kind: 'existing' as const, guardianId: who.guardian.id }
        : {
            kind: 'new' as const,
            guardianId: ids.guardianId,
            surname: values.surname,
            firstName: values.firstName,
            primaryPhone: values.primaryPhone,
            ...(values.whatsappPhone.trim() === '' ? {} : { whatsappPhone: values.whatsappPhone }),
            confirmNew,
          },
  };
}

function FindExisting({
  exclude,
  onPick,
}: {
  exclude: readonly string[];
  onPick: (guardian: GuardianSummary) => void;
}) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const search = useGuardianSearch(q);
  return (
    <div className="flex flex-col gap-2">
      <Field label={copy.find}>
        {(field) => (
          <Input
            {...field}
            type="search"
            value={text}
            maxLength={100}
            placeholder={copy.findHint}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        )}
      </Field>
      {q !== '' && (
        <Loaded query={search} skeleton={<ListSkeleton rows={2} />}>
          {({ items }) => {
            const choices = items.filter((guardian) => !exclude.includes(guardian.id));
            return choices.length === 0 ? (
              <EmptyState title={copy.none} />
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {choices.map((guardian) => (
                  <li key={guardian.id}>
                    <PersonButton
                      firstName={guardian.firstName}
                      surname={guardian.surname}
                      photoUrl={guardian.photoUrl}
                      title={fullName(guardian)}
                      detail={formatGhanaPhone(guardian.primaryPhone)}
                      onClick={() => {
                        onPick(guardian);
                      }}
                    />
                  </li>
                ))}
              </ul>
            );
          }}
        </Loaded>
      )}
    </div>
  );
}

export function AddGuardianDialog({
  student,
  onClose,
}: {
  student: StudentDetail;
  onClose: () => void;
}) {
  const save = useAddGuardianLink(student.id);
  const [tab, setTab] = useState<Who['kind']>('existing');
  const [picked, setPicked] = useState<GuardianSummary>();
  // Fixed while the form is open, so saving twice can't create the person twice.
  const [ids] = useState<Ids>(() => ({ linkId: uuidv7(), guardianId: uuidv7() }));
  const who: Who | undefined =
    tab === 'new'
      ? { kind: 'new' }
      : picked === undefined
        ? undefined
        : { kind: 'existing', guardian: picked };

  const { register, handleSubmit, formState } = useForm<Values>({
    defaultValues: {
      relationship: 'mother',
      isMainContact: false,
      whatsappOptIn: false,
      surname: '',
      firstName: '',
      primaryPhone: '',
      whatsappPhone: '',
    },
    resolver: payloadResolver(guardianLinkCreateSchema, (values: Values) =>
      linkRequest(values, who ?? { kind: 'new' }, ids, false),
    ),
  });
  const { errors } = formState;

  const send = (confirmNew: boolean, chosen: Who) =>
    handleSubmit((values) => {
      save.mutate(linkRequest(values, chosen, ids, confirmNew), {
        onSuccess: () => {
          toast.success(copy.saved);
          onClose();
        },
      });
    });

  const duplicate =
    save.error instanceof ApiError && save.error.code === 'possible_duplicate'
      ? possibleDuplicateSchema.safeParse(save.error.details).data?.matches
      : undefined;

  const text = (name: 'firstName' | 'surname' | 'primaryPhone' | 'whatsappPhone') => (
    <Field label={guardianCopy.labels[name]} error={errors[name]?.message}>
      {(field) => (
        <Input
          {...field}
          {...register(name)}
          type={name.endsWith('Phone') ? 'tel' : 'text'}
          autoComplete="off"
        />
      )}
    </Field>
  );

  const choose = (kind: Who['kind']) => {
    save.reset();
    setPicked(undefined);
    setTab(kind);
  };

  return (
    <Dialog onClose={onClose} title={copy.title}>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(['existing', 'new'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={tab === kind}
            onClick={() => {
              choose(kind);
            }}
            className={cn(
              'min-h-11 rounded-full font-semibold transition-colors',
              tab === kind ? 'bg-card shadow-panel' : 'text-muted-foreground',
            )}
          >
            {copy[kind]}
          </button>
        ))}
      </div>

      {who === undefined ? (
        <FindExisting
          exclude={(student.guardians ?? []).map((guardian) => guardian.guardianId)}
          onPick={setPicked}
        />
      ) : (
        <form
          onSubmit={(event) => void send(false, who)(event)}
          noValidate
          className="flex flex-col gap-4"
        >
          {who.kind === 'existing' ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary p-3">
              <p className="font-semibold">{fullName(who.guardian)}</p>
              <Button
                variant="ghost"
                onClick={() => {
                  setPicked(undefined);
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              {text('firstName')}
              {text('surname')}
              {text('primaryPhone')}
              {text('whatsappPhone')}
            </>
          )}
          <Field label={copy.relationship}>
            {(field) => (
              <Select {...field} {...register('relationship')}>
                {RELATIONSHIPS.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {RELATIONSHIP_LABELS[relationship]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Checkbox label={copy.main} hint={copy.mainHint} {...register('isMainContact')} />
          <Checkbox label={copy.consent} hint={copy.consentHint} {...register('whatsappOptIn')} />

          <FormError
            message={
              save.error === null
                ? undefined
                : duplicate === undefined
                  ? errorMessage(save.error)
                  : `${errorMessage(save.error)} ${copy.duplicate}`
            }
          />
          {duplicate !== undefined ? (
            <>
              <ul>
                {duplicate.map((match) => (
                  <li key={match.id}>
                    <PersonButton
                      firstName={match.firstName}
                      surname={match.surname}
                      photoUrl={match.photoUrl}
                      title={fullName(match)}
                      detail={`${copy.useThis} · ${formatGhanaPhone(match.primaryPhone)}`}
                      onClick={() => {
                        save.reset();
                        setPicked(match);
                        setTab('existing');
                      }}
                    />
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                busy={save.isPending}
                onClick={() => void send(true, who)()}
              >
                {copy.addAnyway}
              </Button>
            </>
          ) : (
            <Button type="submit" size="lg" busy={save.isPending}>
              {copy.submit}
            </Button>
          )}
        </form>
      )}
    </Dialog>
  );
}
