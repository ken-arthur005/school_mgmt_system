import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { ArrowLeft, CircleQuestionMark } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/** The `?` on a screen: a few plain sentences about what it does. */
export function HelpButton({ title, lines }: { title: string; lines: readonly string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen(true);
        }}
        aria-label="Help with this screen"
        className="print:hidden"
      >
        <CircleQuestionMark aria-hidden />
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title={title}
      >
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button
          onClick={() => {
            setOpen(false);
          }}
        >
          Got it
        </Button>
      </Dialog>
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  back = false,
  help,
  actions,
}: {
  /** Left out where the screen's own first block carries the heading (the ID card). */
  title?: string;
  subtitle?: string | undefined;
  /** Offer "Back" on screens reached from a list. */
  back?: boolean;
  help?: { title: string; lines: readonly string[] };
  actions?: ReactNode;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const backButton = back && (
    <Button
      variant="ghost"
      className="-ml-3 self-start px-3 print:hidden"
      onClick={() => {
        if (canGoBack) router.history.back();
        else void router.navigate({ to: '/' });
      }}
    >
      <ArrowLeft aria-hidden />
      Back
    </Button>
  );
  const tools = (
    <div className="flex items-center gap-2 print:hidden">
      {actions}
      {help && <HelpButton {...help} />}
    </div>
  );
  // With no heading of its own, "Back" and the help button share one row.
  if (title === undefined) {
    return (
      <div className="mb-2 flex items-center justify-between gap-3 print:hidden">
        {backButton || <span />}
        {tools}
      </div>
    );
  }
  return (
    <header className="mb-4 flex flex-col gap-1">
      {backButton}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {tools}
      </div>
    </header>
  );
}
