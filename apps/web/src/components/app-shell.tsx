import type { Me } from '@school-mgmt/shared';
import { can } from '@school-mgmt/shared';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import {
  Briefcase,
  ContactRound,
  Ellipsis,
  House,
  LogOut,
  School,
  Search,
  UserRound,
  UsersRound,
  WifiOff,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { ThemePicker } from '@/components/theme-picker';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { signOut } from '@/lib/auth/supabase';
import { BRAND } from '@/lib/brand';
import { useSearchText } from '@/lib/search-text';
import { useOnline } from '@/lib/use-online';

type Destination =
  | { to: '/' | '/search' | '/classes' | '/families' | '/staff' | '/profile'; params?: never }
  | { to: '/classes/$classId'; params: { classId: string } };

type NavItem = Destination & { label: string; icon: typeof House };

/** Everywhere this user can go, in the order of the side menu. */
export function menuFor(me: Me): NavItem[] {
  const [formClass] = me.formClasses;
  const items: (NavItem | false)[] = [
    { to: '/', label: 'Home', icon: House },
    can(me.roles, 'students.read') && { to: '/search', label: 'Search', icon: Search },
    formClass !== undefined && {
      to: '/classes/$classId',
      params: { classId: formClass.id },
      label: 'My class',
      icon: ContactRound,
    },
    can(me.roles, 'students.read') && { to: '/classes', label: 'Classes', icon: School },
    can(me.roles, 'families.read') && { to: '/families', label: 'Families', icon: UsersRound },
    can(me.roles, 'staff.read') && { to: '/staff', label: 'Staff', icon: Briefcase },
    { to: '/profile', label: 'My profile', icon: UserRound },
  ];
  return items.filter((item) => item !== false);
}

const sideLink =
  'flex min-h-11 items-center gap-3 rounded-full px-4 font-semibold text-muted-foreground transition-colors duration-150 outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60 data-[status=active]:bg-primary data-[status=active]:text-primary-foreground';
const tabLink =
  'group flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-inset data-[status=active]:text-foreground';
const tabIcon =
  'grid h-7 w-14 place-items-center rounded-full transition-colors duration-150 group-data-[status=active]:bg-primary group-data-[status=active]:text-primary-foreground';

function NavLink({
  item,
  className,
  children,
  onClick,
}: {
  item: NavItem;
  className: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  // "Home" and "Classes" must not stay lit on the pages under them.
  const activeOptions = { exact: item.to === '/' || item.to === '/classes' };
  const shared = { className, activeOptions, ...(onClick === undefined ? {} : { onClick }) };
  return item.params === undefined ? (
    <Link to={item.to} {...shared}>
      {children}
    </Link>
  ) : (
    <Link to={item.to} params={item.params} {...shared}>
      {children}
    </Link>
  );
}

function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="justify-start px-4"
      onClick={() => void signOut().then(() => router.navigate({ to: '/sign-in', replace: true }))}
    >
      <LogOut aria-hidden />
      Sign out
    </Button>
  );
}

/** Opens the search screen and types there. */
function TopSearch() {
  const router = useRouter();
  const { text, setText } = useSearchText();
  return (
    <div className="relative max-w-md flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={text}
        aria-label="Search by name, admission number or phone"
        placeholder="Name, number or phone"
        className="h-12 w-full rounded-full border border-input/50 bg-card pr-4 pl-12 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        onChange={(event) => {
          setText(event.target.value);
          void router.navigate({ to: '/search' });
        }}
      />
    </div>
  );
}

function OfflineBanner() {
  if (useOnline()) return null;
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center font-semibold text-warning-foreground print:hidden"
    >
      <WifiOff className="size-5 shrink-0" aria-hidden />
      No internet. You can’t load or save until it comes back.
    </p>
  );
}

/** The frame around every signed-in screen: side menu on wide screens, bottom tabs on phones. */
export function AppShell({ me, children }: { me: Me; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const onSearch = useRouterState({ select: (state) => state.location.pathname === '/search' });
  const menu = menuFor(me);
  // Home, Search and one more fit as tabs; the rest sit under "More".
  const tabs = menu.slice(0, 3);
  const more = menu.slice(3);
  const canSearch = can(me.roles, 'students.read');

  return (
    <div className="min-h-dvh md:flex print:block">
      <a
        href="#content"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to the page
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-card p-4 md:flex print:hidden">
        <div className="flex items-center gap-3 px-2">
          <img src={BRAND.crestSmall} alt="" width={44} height={44} className="size-11" />
          <p className="leading-tight font-bold">{me.school.name}</p>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {menu.map((item) => (
            <NavLink key={item.label} item={item} className={sideLink}>
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-2">
          <ThemePicker />
          <SignOutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <OfflineBanner />
        <header className="flex items-center gap-3 px-4 pt-3 md:px-8 md:pt-5 print:hidden">
          <img
            src={BRAND.crestSmall}
            alt={me.school.name}
            width={40}
            height={40}
            className="size-10 md:hidden"
          />
          {canSearch && !onSearch ? <TopSearch /> : <p className="font-bold">{me.school.name}</p>}
        </header>
        <main id="content" className="mx-auto w-full max-w-5xl px-4 pt-4 pb-28 md:px-8 md:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        {tabs.map((item) => (
          <NavLink key={item.label} item={item} className={tabLink}>
            <span className={tabIcon}>
              <item.icon className="size-5" aria-hidden />
            </span>
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className={tabLink}
          onClick={() => {
            setMoreOpen(true);
          }}
        >
          <span className={tabIcon}>
            <Ellipsis className="size-5" aria-hidden />
          </span>
          More
        </button>
      </nav>

      <Dialog
        open={moreOpen}
        onClose={() => {
          setMoreOpen(false);
        }}
        title="More"
      >
        <nav aria-label="More" className="flex flex-col gap-1">
          {more.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              className={sideLink}
              onClick={() => {
                setMoreOpen(false);
              }}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemePicker />
        <SignOutButton />
      </Dialog>
    </div>
  );
}
