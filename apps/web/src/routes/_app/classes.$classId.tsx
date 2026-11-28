import { createFileRoute } from '@tanstack/react-router';
import { ClassScreen } from '@/features/classes/components/class-screen';

function Page() {
  const { classId } = Route.useParams();
  return <ClassScreen classId={classId} />;
}

export const Route = createFileRoute('/_app/classes/$classId')({ component: Page });
