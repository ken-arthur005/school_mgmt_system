import { z } from 'zod';

export const appEnvSchema = z.enum(['development', 'staging', 'production']);
export type AppEnv = z.infer<typeof appEnvSchema>;

/** Response of the API's public `GET /health` check. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  env: appEnvSchema,
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
