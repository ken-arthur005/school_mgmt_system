import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

/**
 * Supabase is used for signing in and nothing else (Golden rule 3): all reading and writing of
 * school data goes through our API.
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** The current login token, refreshed if needed. Null when signed out. */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export type SignInProblem = 'wrong_details' | 'offline' | 'other';

export async function signIn(email: string, password: string): Promise<SignInProblem | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error === null) return null;
  if (error.status === 400 || error.status === 401) return 'wrong_details';
  return error.status === undefined || error.status === 0 ? 'offline' : 'other';
}

/** Signs out on this device. Works without internet. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
