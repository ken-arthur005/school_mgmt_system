import { formatDate, type Me, type StudentDetail } from '@school-mgmt/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge, Details, Panel } from '@/components/panel';
import { Loaded } from '@/components/states';
import { Button } from '@/components/ui/button';
import { StudentGuardians } from '@/features/guardians/components/student-guardians';
import { coversClass, useCan, useMe } from '@/features/me/hooks';
import { PhotoAvatar } from '@/features/photos/components/photo-avatar';
import { fullName, RELIGION_LABELS, SEX_LABELS, STATUS_LABELS } from '@/lib/labels';
import { studentCopy as copy } from '../copy';
import { useStudent } from '../hooks';
import { EditStudentDialog } from './edit-student-dialog';
import { MedicalNotes } from './medical-notes';
import { Siblings } from './siblings';

/** The top of the profile, laid out like a school ID card. */
function IdCard({ student, me }: { student: StudentDetail; me: Me | undefined }) {
  const className = student.currentEnrolment?.className ?? null;
  const mayChangePhoto =
    me !== undefined && student.archivedAt === null && coversClass(me, 'photos.edit', className);
  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-panel">
      <div className="h-2 bg-gold print:hidden" />
      <div className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
        <PhotoAvatar
          firstName={student.firstName}
          surname={student.surname}
          photoUrl={student.photoUrl}
          path={mayChangePhoto ? `/students/${student.id}/photo` : undefined}
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words sm:text-3xl">{fullName(student)}</h1>
          <p className="text-muted-foreground tabular-nums">
            {copy.labels.admissionNumber}: {student.admissionNumber}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge tone="good">{className ?? copy.noClass}</Badge>
            {student.currentEnrolment?.isBoarder && <Badge tone="gold">{copy.boarder}</Badge>}
            {student.status !== 'active' && (
              <Badge tone="warning">{STATUS_LABELS[student.status]}</Badge>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Profile({ student }: { student: StudentDetail }) {
  const me = useMe();
  const mayEdit = useCan('students.edit') && student.archivedAt === null;
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <IdCard student={student} me={me.data} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {student.guardians !== undefined && (
            <StudentGuardians student={student} guardians={student.guardians} />
          )}
          <Siblings student={student} />
        </div>
        <div className="flex flex-col gap-4">
          {student.medicalNotes !== undefined && (
            <MedicalNotes studentId={student.id} notes={student.medicalNotes} />
          )}
          <Panel
            title={copy.details}
            action={
              mayEdit && (
                <Button
                  variant="secondary"
                  className="print:hidden"
                  onClick={() => {
                    setEditing(true);
                  }}
                >
                  <Pencil aria-hidden />
                  {copy.edit}
                </Button>
              )
            }
          >
            <Details
              items={[
                [copy.labels.sex, SEX_LABELS[student.sex]],
                [copy.labels.dateOfBirth, formatDate(student.dateOfBirth)],
                [copy.labels.admittedOn, formatDate(student.admittedOn)],
                [copy.labels.religion, student.religion && RELIGION_LABELS[student.religion]],
                [copy.labels.ghanaCardNumber, student.ghanaCardNumber],
                [copy.labels.nhisNumber, student.nhisNumber],
              ]}
            />
          </Panel>
        </div>
      </div>
      {editing && (
        <EditStudentDialog
          student={student}
          onClose={() => {
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

export function StudentScreen({ studentId }: { studentId: string }) {
  const student = useStudent(studentId);
  return (
    <>
      <PageHeader back help={copy.help} />
      <Loaded query={student}>{(data) => <Profile key={data.id} student={data} />}</Loaded>
    </>
  );
}
