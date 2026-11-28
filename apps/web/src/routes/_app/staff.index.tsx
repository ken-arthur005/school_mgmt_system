import { createFileRoute } from '@tanstack/react-router';
import { StaffListScreen } from '@/features/staff/components/staff-list-screen';

export const Route = createFileRoute('/_app/staff/')({ component: StaffListScreen });
