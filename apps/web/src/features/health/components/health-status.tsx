import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHealth } from '@/lib/api';
import { healthCopy } from '../copy';

export function HealthStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    retry: 1,
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{healthCopy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          {health.isPending || health.isRefetching ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              {healthCopy.checking}
            </p>
          ) : health.isError ? (
            <>
              <p className="flex items-start gap-2">
                <WifiOff className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                {healthCopy.offline}
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  void health.refetch();
                }}
              >
                {healthCopy.retry}
              </Button>
            </>
          ) : (
            <p className="flex items-center gap-2 text-lg font-medium text-success">
              <CircleCheck className="size-6" aria-hidden="true" />
              {healthCopy.healthy}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
