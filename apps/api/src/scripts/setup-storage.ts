// Creates the private photo bucket in the Supabase project named by SUPABASE_URL, or updates its
// limits. Safe to run again. Run once per environment: `pnpm storage:setup`.
import { z } from 'zod';
import { ensurePhotoBucket, PHOTO_BUCKET } from '../modules/photos/storage';

const env = z
  .object({ SUPABASE_URL: z.url(), SUPABASE_SECRET_KEY: z.string().min(1) })
  .parse(process.env);

const result = await ensurePhotoBucket(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
console.log(`Private bucket "${PHOTO_BUCKET}" ${result} on ${new URL(env.SUPABASE_URL).host}.`);
