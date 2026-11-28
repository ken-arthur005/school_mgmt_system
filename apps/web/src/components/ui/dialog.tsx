import { X } from 'lucide-react';
import { Dialog as Primitive } from 'radix-ui';
import type { ReactNode } from 'react';

/**
 * A panel over the screen: slides up from the bottom on phones (within thumb reach) and sits in
 * the middle on larger screens.
 */
export function Dialog({
  open = true,
  onClose,
  title,
  description,
  children,
}: {
  /** Left out when the dialog is only drawn while it is open. */
  open?: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Primitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-card-foreground shadow-panel duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:data-[state=closed]:fade-out sm:data-[state=open]:fade-in"
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Primitive.Title className="text-xl font-bold">{title}</Primitive.Title>
              {description && (
                <Primitive.Description className="mt-1 text-muted-foreground">
                  {description}
                </Primitive.Description>
              )}
            </div>
            <Primitive.Close
              className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/60"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </Primitive.Close>
          </div>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
