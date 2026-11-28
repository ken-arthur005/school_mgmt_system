import { can, type HomeSummary, type Me } from '@school-mgmt/shared';
import { createLink } from '@tanstack/react-router';
import { ArrowRight, Briefcase, School, Search, UserSearch, UsersRound } from 'lucide-react';
import type { ComponentProps } from 'react';
import { PageHeader } from '@/components/page-header';
import { Panel } from '@/components/panel';
import { EmptyState, Loaded, Skeleton } from '@/components/states';
import { useHomeSummary, useMe } from '@/features/me/hooks';
import { cn } from '@/lib/utils';
import { homeCopy as copy } from '../copy';

export function greetingFor(hour: number): string {
  if (hour < 12) return copy.morning;
  return hour < 17 ? copy.afternoon : copy.evening;
}

/** The hour at the school, whatever the phone's clock zone says. */
const schoolHour = () =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Accra',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  );

const tile =
  'group flex min-h-24 items-center gap-4 rounded-xl p-4 shadow-panel transition-[transform,box-shadow] duration-200 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-[0.98]';

function TaskAnchor({
  icon: Icon,
  title,
  hint,
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'children'> & { icon: typeof School; title: string; hint: string }) {
  return (
    <a className={cn(tile, 'bg-card', className)} {...props}>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      <ArrowRight
        className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
        aria-hidden
      />
    </a>
  );
}
const TaskLink = createLink(TaskAnchor);

/** The deep green card for the class a teacher is responsible for. */
function ClassAnchor({
  name,
  count,
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'children'> & { name: string; count: number }) {
  return (
    <a className={cn(tile, 'feature-surface min-h-36 sm:col-span-2', className)} {...props}>
      <span className="flex-1">
        <span className="block font-semibold opacity-85">{copy.myClass}</span>
        <span className="block text-3xl font-bold">{name}</span>
        <span className="mt-2 inline-block rounded-full bg-gold px-3 py-0.5 font-bold text-gold-foreground">
          {count} students
        </span>
      </span>
      <ArrowRight
        className="size-7 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
        aria-hidden
      />
    </a>
  );
}
const ClassLink = createLink(ClassAnchor);

function Counts({ summary }: { summary: HomeSummary }) {
  if (summary.studentCount === null || summary.classCount === null) return null;
  const counts = [
    [summary.studentCount, summary.studentCount === 1 ? 'student' : 'students'],
    [summary.classCount, summary.classCount === 1 ? 'class' : 'classes'],
  ] as const;
  return (
    <Panel>
      <dl className="flex divide-x">
        {counts.map(([value, label]) => (
          <div key={label} className="flex flex-1 flex-col-reverse items-center py-1">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-4xl font-bold tabular-nums">{value.toLocaleString('en-GB')}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export function HomeTasks({ me, summary }: { me: Me; summary: HomeSummary }) {
  if (!can(me.roles, 'students.read')) {
    return (
      <Panel>
        <EmptyState title={copy.nothingTitle}>
          <p className="text-muted-foreground">{copy.nothingBody}</p>
        </EmptyState>
      </Panel>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {summary.myClasses.map((mine) => (
        <ClassLink
          key={mine.id}
          to="/classes/$classId"
          params={{ classId: mine.id }}
          name={mine.name}
          count={mine.studentCount}
        />
      ))}
      <TaskLink to="/search" icon={Search} title={copy.findStudent} hint={copy.findStudentHint} />
      {can(me.roles, 'guardians.read') && (
        <TaskLink
          to="/search"
          icon={UserSearch}
          title={copy.findParent}
          hint={copy.findParentHint}
        />
      )}
      <TaskLink to="/classes" icon={School} title={copy.classes} hint={copy.classesHint} />
      {can(me.roles, 'families.read') && (
        <TaskLink to="/families" icon={UsersRound} title={copy.families} hint={copy.familiesHint} />
      )}
      {can(me.roles, 'staff.read') && (
        <TaskLink to="/staff" icon={Briefcase} title={copy.staff} hint={copy.staffHint} />
      )}
    </div>
  );
}

export function HomeScreen() {
  const me = useMe();
  const summary = useHomeSummary();
  const firstName = me.data?.displayName.split(' ')[0] ?? '';
  return (
    <>
      <PageHeader
        title={`${greetingFor(schoolHour())}, ${firstName}`}
        subtitle={me.data?.academicYearName ?? undefined}
        help={copy.help}
      />
      <Loaded query={summary} skeleton={<Skeleton className="h-64 rounded-xl" />}>
        {(counts) =>
          me.data !== undefined && (
            <div className="flex flex-col gap-3">
              <HomeTasks me={me.data} summary={counts} />
              <Counts summary={counts} />
            </div>
          )
        }
      </Loaded>
    </>
  );
}
