import { z } from 'zod';

// Only public values belong here: every VITE_* variable ends up in the browser bundle.
const envSchema = z.object({
  VITE_API_URL: z.url(),
});

const result = envSchema.safeParse(import.meta.env);
if (!result.success) {
  throw new Error(`Invalid web environment:\n${z.prettifyError(result.error)}`);
}

export const env = result.data;
