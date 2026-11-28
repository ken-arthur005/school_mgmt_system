import { createFileRoute } from '@tanstack/react-router';
import { SearchScreen } from '@/features/search/components/search-screen';

export const Route = createFileRoute('/_app/search')({ component: SearchScreen });
