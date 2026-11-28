import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { ErrorState, PageSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/me/hooks';
import { accessToken, signOut } from '@/lib/auth/supabase';

/** Everything behind sign-in. */
function SignedIn() {
  const me = useMe();
  if (me.data !== undefined) {
    return (
      <AppShell me={me.data}>
        <Outlet />
      </AppShell>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-3 px-4">
      {me.error === null ? (
        <PageSkeleton />
      ) : (
        <>
          <ErrorState error={me.error} retry={() => void me.refetch()} />
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </>
      )}
    </main>
  );
}

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    if ((await accessToken()) === null) throw redirect({ to: '/sign-in', replace: true });
  },
  component: SignedIn,
});
