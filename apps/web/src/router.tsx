import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { PageSkeleton } from '@/components/states';
import { routeTree } from './routeTree.gen';

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    // Screens start loading as soon as a link is touched or pointed at.
    defaultPreload: 'intent',
    defaultViewTransition: true,
    defaultPendingComponent: PageSkeleton,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
