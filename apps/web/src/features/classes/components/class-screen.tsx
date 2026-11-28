import { Printer } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Panel } from '@/components/panel';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { Button } from '@/components/ui/button';
import { useClasses, useMe } from '@/features/me/hooks';
import { StudentRows } from '@/features/students/components/student-rows';
import { useClassStudents } from '@/features/students/hooks';
import { classCopy as copy } from '../copy';

export function ClassScreen({ classId }: { classId: string }) {
  const students = useClassStudents(classId);
  const classes = useClasses();
  const me = useMe();
  const current = classes.data?.items.find((item) => item.id === classId);
  const subtitle = [
    current && copy.students(current.studentCount),
    current?.formTeacherName,
    me.data?.academicYearName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <p className="hidden text-lg font-bold print:block">{me.data?.school.name}</p>
      <PageHeader
        title={current?.name ?? 'Class list'}
        subtitle={subtitle}
        back
        help={copy.listHelp}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              window.print();
            }}
            disabled={!students.data}
          >
            <Printer aria-hidden />
            {copy.print}
          </Button>
        }
      />
      <Panel>
        <Loaded query={students} skeleton={<ListSkeleton />}>
          {({ items }) =>
            items.length === 0 ? (
              <EmptyState title={copy.listEmpty} />
            ) : (
              <StudentRows students={items} />
            )
          }
        </Loaded>
      </Panel>
    </>
  );
}
