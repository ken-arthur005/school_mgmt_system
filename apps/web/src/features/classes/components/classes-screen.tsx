import { Link } from '@tanstack/react-router';
import { PageHeader } from '@/components/page-header';
import { Badge, Panel } from '@/components/panel';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { useClasses } from '@/features/me/hooks';
import { classCopy as copy } from '../copy';

export function ClassesScreen() {
  const classes = useClasses();
  return (
    <>
      <PageHeader title={copy.title} help={copy.help} />
      <Loaded
        query={classes}
        skeleton={
          <Panel>
            <ListSkeleton />
          </Panel>
        }
      >
        {({ items }) =>
          items.length === 0 ? (
            <Panel>
              <EmptyState title={copy.empty} />
            </Panel>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/classes/$classId"
                    params={{ classId: item.id }}
                    className="flex min-h-24 flex-col justify-center rounded-xl bg-card p-4 shadow-panel transition-transform duration-200 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-[0.98]"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xl font-bold">{item.name}</span>
                      {item.isMyFormClass && <Badge tone="gold">{copy.mine}</Badge>}
                    </span>
                    <span className="text-muted-foreground">
                      {copy.students(item.studentCount)}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {item.formTeacherName ?? copy.noFormTeacher}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </Loaded>
    </>
  );
}
