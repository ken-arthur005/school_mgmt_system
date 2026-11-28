import { useRouter } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge, Panel } from '@/components/panel';
import { Loaded } from '@/components/states';
import { ThemePicker } from '@/components/theme-picker';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/me/hooks';
import { PhotoAvatar } from '@/features/photos/components/photo-avatar';
import { signOut } from '@/lib/auth/supabase';
import { ROLE_LABELS } from '@/lib/labels';
import { staffCopy } from '../copy';

const copy = staffCopy.profile;

export function ProfileScreen() {
  const me = useMe();
  const router = useRouter();
  return (
    <>
      <PageHeader title={copy.title} help={copy.help} />
      <Loaded query={me}>
        {(data) => {
          const [firstName = '', ...rest] = data.displayName.split(' ');
          const classes = [...data.formClasses, ...data.taughtClasses];
          return (
            <div className="flex flex-col gap-4">
              <section className="flex flex-col items-center gap-4 rounded-xl bg-card p-5 text-center shadow-panel sm:flex-row sm:text-left">
                <PhotoAvatar
                  firstName={firstName}
                  surname={rest.at(-1) ?? ''}
                  photoUrl={data.photoUrl}
                  path={data.staffId === null ? undefined : '/me/photo'}
                />
                <div>
                  <p className="text-2xl font-bold">{data.displayName}</p>
                  <p className="text-muted-foreground">{data.jobTitle ?? data.school.name}</p>
                </div>
              </section>
              <Panel title={copy.roles}>
                <ul className="flex flex-wrap gap-2">
                  {data.roles.map((role) => (
                    <li key={role}>
                      <Badge tone="good">{ROLE_LABELS[role]}</Badge>
                    </li>
                  ))}
                </ul>
              </Panel>
              {classes.length > 0 && (
                <Panel title={copy.classes}>
                  <ul className="flex flex-wrap gap-2">
                    {[...new Map(classes.map((item) => [item.id, item])).values()].map((item) => (
                      <li key={item.id}>
                        <Badge>{item.name}</Badge>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title={copy.colours}>
                <div className="max-w-sm">
                  <ThemePicker />
                </div>
              </Panel>
              <Button
                variant="outline"
                onClick={() =>
                  void signOut().then(() => router.navigate({ to: '/sign-in', replace: true }))
                }
              >
                <LogOut aria-hidden />
                {copy.signOut}
              </Button>
            </div>
          );
        }}
      </Loaded>
    </>
  );
}
