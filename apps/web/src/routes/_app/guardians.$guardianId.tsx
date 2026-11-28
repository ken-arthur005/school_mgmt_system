import { createFileRoute } from '@tanstack/react-router';
import { GuardianScreen } from '@/features/guardians/components/guardian-screen';

function Page() {
  const { guardianId } = Route.useParams();
  return <GuardianScreen guardianId={guardianId} />;
}

export const Route = createFileRoute('/_app/guardians/$guardianId')({ component: Page });
