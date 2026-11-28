import { createFileRoute } from '@tanstack/react-router';
import { FamiliesScreen } from '@/features/families/components/families-screen';

export const Route = createFileRoute('/_app/families/')({ component: FamiliesScreen });
