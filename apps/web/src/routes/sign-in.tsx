import { createFileRoute, redirect } from '@tanstack/react-router';
import { SignInScreen } from '@/features/auth/components/sign-in-screen';
import { accessToken } from '@/lib/auth/supabase';

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    if ((await accessToken()) !== null) throw redirect({ to: '/', replace: true });
  },
  component: SignInScreen,
});
