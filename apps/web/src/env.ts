import { z } from 'zod';

// Only public values belong here: every VITE_* variable ends up in the browser bundle.
const envSchema = z.object({
  VITE_API_URL: z.url(),
  // For signing in only. All school data comes from our API.
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const result = envSchema.safeParse(import.meta.env);
if (!result.success) {
  throw new Error(`Invalid web environment:\n${z.prettifyError(result.error)}`);
}

export const env = result.data;
