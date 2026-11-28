import { Inbox, Lock, TriangleAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage, OfflineError } from '@/lib/api';
import { cn } from '@/lib/utils';

function Message({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-7">
        {icon}
      </span>
      <p className="max-w-[40ch] text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Message icon={<Inbox aria-hidden />} title={title}>
      {children}
    </Message>
  );
}

/** Why something didn't load, and what to do about it. */
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const refused = error instanceof ApiError && (error.status === 403 || error.status === 404);
  const icon =
    error instanceof OfflineError ? (
      <WifiOff aria-hidden />
    ) : refused ? (
      <Lock aria-hidden />
    ) : (
      <TriangleAlert aria-hidden />
    );
  return (
    <div role="alert">
      <Message icon={icon} title={errorMessage(error)}>
        {!refused && retry && <Button onClick={retry}>Try again</Button>}
      </Message>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-1">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-16 items-center gap-3 px-2">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  refetch: () => unknown;
}

/** Shows a query's loading and error states, then the content once there is data. */
export function Loaded<T>({
  query,
  skeleton = <PageSkeleton />,
  children,
}: {
  query: QueryLike<T>;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  // Data already on screen stays there if a later refresh fails.
  if (query.data !== undefined) return children(query.data);
  if (query.error !== null && query.error !== undefined) {
    return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  }
  return skeleton;
}
