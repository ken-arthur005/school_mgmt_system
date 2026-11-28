import { createFileRoute } from '@tanstack/react-router';
import { ClassesScreen } from '@/features/classes/components/classes-screen';

export const Route = createFileRoute('/_app/classes/')({ component: ClassesScreen });
