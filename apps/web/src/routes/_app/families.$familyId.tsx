import { createFileRoute } from '@tanstack/react-router';
import { FamilyScreen } from '@/features/families/components/family-screen';

function Page() {
  const { familyId } = Route.useParams();
  return <FamilyScreen familyId={familyId} />;
}

export const Route = createFileRoute('/_app/families/$familyId')({ component: Page });
