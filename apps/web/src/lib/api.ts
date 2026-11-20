import { healthResponseSchema, type HealthResponse } from '@school-mgmt/shared';
import { env } from '@/env';

/** Calls the API's public health check and checks the answer has the expected shape. */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(new URL('/health', env.VITE_API_URL), signal ? { signal } : {});
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return healthResponseSchema.parse(await res.json());
}
