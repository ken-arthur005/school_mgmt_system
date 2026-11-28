import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { EmptyState } from '@/components/states';
import { buttonVariants } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';

function Root() {
  const [theme] = useTheme();
  return (
    <>
      <Outlet />
      <Toaster
        theme={theme}
        position="top-center"
        duration={6000}
        closeButton
        toastOptions={{ classNames: { actionButton: '!min-h-9 !px-4 !font-semibold' } }}
      />
    </>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4">
      <EmptyState title="We could not find that page.">
        <Link to="/" className={buttonVariants()}>
          Go to Home
        </Link>
      </EmptyState>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
});
