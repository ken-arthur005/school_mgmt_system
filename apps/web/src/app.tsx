import { HealthStatus } from '@/features/health/components/health-status';

export function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">School Manager</h1>
      <HealthStatus />
    </main>
  );
}
