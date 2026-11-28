import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-md border border-input bg-card px-3 text-base text-foreground transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60 aria-invalid:border-destructive';

interface ControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

/** A labelled form field with its help text and error right beside it. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': message === undefined ? undefined : `${id}-message`,
      })}
      {message !== undefined && (
        <p
          id={`${id}-message`}
          className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-28 py-2.5', className)} {...props} />;
}

/** The phone's own picker: familiar, and it needs no extra code. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'h-12', className)} {...props} />;
}

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label: string; hint?: string }) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2', className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" {...props} />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

/** A problem with the whole form, shown above its buttons. */
export function FormError({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p role="alert" className="rounded-md bg-warning p-3 text-warning-foreground">
      {message}
    </p>
  );
}
