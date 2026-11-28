import { createFileRoute } from '@tanstack/react-router';
import { StaffScreen } from '@/features/staff/components/staff-screen';

function Page() {
  const { staffId } = Route.useParams();
  return <StaffScreen staffId={staffId} />;
}

export const Route = createFileRoute('/_app/staff/$staffId')({ component: Page });
