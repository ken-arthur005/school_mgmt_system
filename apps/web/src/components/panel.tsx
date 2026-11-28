import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One titled block of a screen. */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl bg-card p-4 text-card-foreground shadow-panel sm:p-5 print:p-0',
        className,
      )}
    >
      {(title !== undefined || action !== undefined) && (
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
          {title !== undefined && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label and value pairs; empty values are shown as "Not recorded". */
export function Details({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">
            {value ?? <span className="font-normal text-muted-foreground">Not recorded</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Badge({ children, tone = 'plain' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap',
        tone === 'plain' && 'bg-secondary text-secondary-foreground',
        tone === 'gold' && 'bg-gold text-gold-foreground',
        tone === 'good' && 'bg-accent text-accent-foreground',
        tone === 'warning' && 'bg-warning text-warning-foreground',
      )}
    >
      {children}
    </span>
  );
}
export type BadgeTone = 'plain' | 'gold' | 'good' | 'warning';
