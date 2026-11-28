import { formatGhanaPhone } from '@school-mgmt/shared';
import { PageHeader } from '@/components/page-header';
import { Panel } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { Input } from '@/components/ui/field';
import { useGuardianSearch } from '@/features/guardians/hooks';
import { useCan } from '@/features/me/hooks';
import { StudentRows } from '@/features/students/components/student-rows';
import { useStudentSearch } from '@/features/students/hooks';
import { fullName } from '@/lib/labels';
import { useSearchText } from '@/lib/search-text';
import { useDebounced } from '@/lib/use-debounced';
import { searchCopy as copy } from '../copy';

function More({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return <p className="px-2 pt-2 text-sm text-muted-foreground">{copy.more(shown, total)}</p>;
}

function StudentResults({ q }: { q: string }) {
  const search = useStudentSearch(q);
  return (
    <Panel title={copy.students}>
      <Loaded query={search} skeleton={<ListSkeleton rows={3} />}>
        {({ items, total }) =>
          items.length === 0 ? (
            <EmptyState title={copy.noStudents} />
          ) : (
            <>
              <StudentRows students={items} />
              <More shown={items.length} total={total} />
            </>
          )
        }
      </Loaded>
    </Panel>
  );
}

function ParentResults({ q }: { q: string }) {
  const search = useGuardianSearch(q);
  return (
    <Panel title={copy.parents}>
      <Loaded query={search} skeleton={<ListSkeleton rows={3} />}>
        {({ items, total }) =>
          items.length === 0 ? (
            <EmptyState title={copy.noParents} />
          ) : (
            <>
              <ul>
                {items.map((guardian) => (
                  <li key={guardian.id}>
                    <PersonLink
                      to="/guardians/$guardianId"
                      params={{ guardianId: guardian.id }}
                      firstName={guardian.firstName}
                      surname={guardian.surname}
                      photoUrl={guardian.photoUrl}
                      title={fullName(guardian)}
                      detail={formatGhanaPhone(guardian.primaryPhone)}
                    />
                  </li>
                ))}
              </ul>
              <More shown={items.length} total={total} />
            </>
          )
        }
      </Loaded>
    </Panel>
  );
}

export function SearchScreen() {
  const { text, setText } = useSearchText();
  const q = useDebounced(text.trim());
  const seesParents = useCan('guardians.read');
  return (
    <>
      <PageHeader title={copy.title} help={copy.help} />
      <Input
        type="search"
        aria-label={copy.label}
        placeholder={copy.label}
        value={text}
        maxLength={100}
        // This screen exists to type into.
        autoFocus
        className="mb-4 h-14 rounded-full px-5 text-lg"
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      {q === '' ? (
        <p className="px-2 text-muted-foreground">{copy.start}</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <StudentResults q={q} />
          {seesParents && <ParentResults q={q} />}
        </div>
      )}
    </>
  );
}
