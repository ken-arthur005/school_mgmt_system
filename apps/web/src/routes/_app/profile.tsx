import { createFileRoute } from '@tanstack/react-router';
import { ProfileScreen } from '@/features/staff/components/profile-screen';

export const Route = createFileRoute('/_app/profile')({ component: ProfileScreen });
