import { createLink } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export function initials(firstName: string, surname: string): string {
  return `${firstName.charAt(0)}${surname.charAt(0)}`.toUpperCase();
}

/** The person's photo, or their initials when there isn't one (or it can't load). */
export function Avatar({
  firstName,
  surname,
  photoUrl,
  className,
}: {
  firstName: string;
  surname: string;
  photoUrl: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span
      className={cn(
        'grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-avatar font-bold text-avatar-foreground',
        className,
      )}
      aria-hidden
    >
      {photoUrl !== null && broken !== photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => {
            setBroken(photoUrl);
          }}
        />
      ) : (
        initials(firstName, surname)
      )}
    </span>
  );
}

const rowStyle =
  'flex min-h-16 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/60 active:bg-secondary';

interface RowProps {
  firstName: string;
  surname: string;
  photoUrl: string | null;
  title: string;
  detail?: ReactNode;
  badge?: ReactNode;
}

function RowContent({ firstName, surname, photoUrl, title, detail, badge }: RowProps) {
  return (
    <>
      <Avatar firstName={firstName} surname={surname} photoUrl={photoUrl} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        {detail && <span className="block truncate text-sm text-muted-foreground">{detail}</span>}
      </span>
      {badge}
    </>
  );
}

function RowAnchor({
  firstName,
  surname,
  photoUrl,
  title,
  detail,
  badge,
  className,
  ...props
}: RowProps & Omit<ComponentProps<'a'>, 'children'>) {
  const content = { firstName, surname, photoUrl, title, detail, badge };
  return (
    <a className={cn(rowStyle, className)} {...props}>
      <RowContent {...content} />
      <ChevronRight className="size-5 shrink-0 text-muted-foreground print:hidden" aria-hidden />
    </a>
  );
}

/** A person in a list that opens their page. Takes the router's `to` and `params`. */
export const PersonLink = createLink(RowAnchor);

/** A person in a list that does something when pressed (choosing them in a form). */
export function PersonButton(props: RowProps & { onClick: () => void; disabled?: boolean }) {
  const { onClick, disabled, ...content } = props;
  return (
    <button type="button" className={rowStyle} onClick={onClick} disabled={disabled}>
      <RowContent {...content} />
    </button>
  );
}
