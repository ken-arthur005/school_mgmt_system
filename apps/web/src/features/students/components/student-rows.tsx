import type { StudentSummary } from '@school-mgmt/shared';
import { Badge } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { fullName, STATUS_LABELS } from '@/lib/labels';

export function StudentRows({ students }: { students: readonly StudentSummary[] }) {
  return (
    <ul className="flex flex-col">
      {students.map((student) => (
        <li key={student.id} className="print:break-inside-avoid">
          <PersonLink
            to="/students/$studentId"
            params={{ studentId: student.id }}
            firstName={student.firstName}
            surname={student.surname}
            photoUrl={student.photoUrl}
            title={fullName(student)}
            detail={[student.className, student.admissionNumber].filter(Boolean).join(' · ')}
            badge={
              student.status === 'active' ? undefined : (
                <Badge tone="warning">{STATUS_LABELS[student.status]}</Badge>
              )
            }
          />
        </li>
      ))}
    </ul>
  );
}
