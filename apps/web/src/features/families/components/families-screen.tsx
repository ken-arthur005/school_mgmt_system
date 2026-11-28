import { uuidv7 } from '@school-mgmt/shared';
import { Link, useRouter } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Panel } from '@/components/panel';
import { Avatar } from '@/components/person';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormError, Input } from '@/components/ui/field';
import { useCan } from '@/features/me/hooks';
import { type PickedStudent, StudentPicker } from '@/features/students/components/student-picker';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';
import { useSave } from '@/lib/use-save';
import { familyDetailSchema } from '@school-mgmt/shared';
import { familyCopy as copy } from '../copy';
import { FAMILY_PAGE_SIZE, useFamilies } from '../hooks';

function NewFamilyDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [id] = useState(uuidv7);
  const [picked, setPicked] = useState<PickedStudent>();
  const create = useSave((input: { studentId: string; move: boolean }) =>
    api('/families', familyDetailSchema, {
      method: 'POST',
      body: { id, studentIds: [input.studentId], move: input.move },
    }),
  );
  const elsewhere = create.error instanceof ApiError && create.error.code === 'in_other_family';

  return (
    <Dialog onClose={onClose} title={copy.create} description={copy.createHint}>
      {picked === undefined ? (
        <StudentPicker exclude={[]} onPick={setPicked} />
      ) : (
        <>
          <p className="text-lg font-semibold">{picked.name}</p>
          <FormError message={create.error === null ? undefined : errorMessage(create.error)} />
          <Button
            size="lg"
            busy={create.isPending}
            onClick={() => {
              create.mutate(
                { studentId: picked.id, move: elsewhere },
                {
                  onSuccess: (family) =>
                    void router.navigate({
                      to: '/families/$familyId',
                      params: { familyId: family.id },
                    }),
                },
              );
            }}
          >
            {elsewhere ? copy.move : copy.create}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              create.reset();
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

export function FamiliesScreen() {
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const mayManage = useCan('families.manage');
  const families = useFamilies(useDebounced(text.trim()), page);

  return (
    <>
      <PageHeader
        title={copy.title}
        help={copy.help}
        actions={
          mayManage && (
            <Button
              onClick={() => {
                setCreating(true);
              }}
            >
              <Plus aria-hidden />
              {copy.create}
            </Button>
          )
        }
      />
      <Input
        type="search"
        aria-label={copy.search}
        placeholder={copy.search}
        value={text}
        maxLength={100}
        className="mb-4 rounded-full px-5"
        onChange={(event) => {
          setText(event.target.value);
          setPage(1);
        }}
      />
      <Panel>
        <Loaded query={families} skeleton={<ListSkeleton />}>
          {({ items, total }) => (
            <>
              {items.length === 0 ? (
                <EmptyState title={text.trim() === '' ? copy.none : copy.empty} />
              ) : (
                <ul className="divide-y">
                  {items.map((family) => (
                    <li key={family.id}>
                      <Link
                        to="/families/$familyId"
                        params={{ familyId: family.id }}
                        className="flex min-h-16 items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{family.name}</span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {family.children.map((child) => child.firstName).join(', ')}
                          </span>
                        </span>
                        <span className="flex shrink-0 -space-x-3">
                          {family.children.slice(0, 4).map((child) => (
                            <Avatar
                              key={child.studentId}
                              firstName={child.firstName}
                              surname={child.surname}
                              photoUrl={child.photoUrl}
                              className="size-10 text-sm ring-2 ring-card"
                            />
                          ))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {total > FAMILY_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => {
                      setPage(page - 1);
                    }}
                  >
                    {copy.previous}
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {page} of {Math.ceil(total / FAMILY_PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page * FAMILY_PAGE_SIZE >= total}
                    onClick={() => {
                      setPage(page + 1);
                    }}
                  >
                    {copy.next}
                  </Button>
                </div>
              )}
            </>
          )}
        </Loaded>
      </Panel>
      {creating && (
        <NewFamilyDialog
          onClose={() => {
            setCreating(false);
          }}
        />
      )}
    </>
  );
}
