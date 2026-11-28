import { createFileRoute } from '@tanstack/react-router';
import { StudentScreen } from '@/features/students/components/student-screen';

function Page() {
  const { studentId } = Route.useParams();
  return <StudentScreen studentId={studentId} />;
}

export const Route = createFileRoute('/_app/students/$studentId')({ component: Page });
