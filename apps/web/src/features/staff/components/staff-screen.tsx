import { formatGhanaPhone } from '@school-mgmt/shared';
import { PageHeader } from '@/components/page-header';
import { Details, Panel } from '@/components/panel';
import { Loaded } from '@/components/states';
import { useCan } from '@/features/me/hooks';
import { PhotoAvatar } from '@/features/photos/components/photo-avatar';
import { EMPLOYMENT_LABELS, fullName } from '@/lib/labels';
import { staffCopy as copy } from '../copy';
import { useStaffMember } from '../hooks';

export function StaffScreen({ staffId }: { staffId: string }) {
  const member = useStaffMember(staffId);
  const mayChangePhoto = useCan('staff.photo');
  return (
    <>
      <PageHeader back help={copy.help} />
      <Loaded query={member}>
        {(person) => (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col items-center gap-4 rounded-xl bg-card p-5 text-center shadow-panel sm:flex-row sm:text-left">
              <PhotoAvatar
                firstName={person.firstName}
                surname={person.surname}
                photoUrl={person.photoUrl}
                path={mayChangePhoto ? `/staff/${person.id}/photo` : undefined}
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold break-words sm:text-3xl">{fullName(person)}</h1>
                <p className="text-muted-foreground">{person.jobTitle}</p>
              </div>
            </section>
            <Panel title={copy.details}>
              <Details
                items={[
                  [copy.jobTitle, person.jobTitle],
                  [copy.employment, EMPLOYMENT_LABELS[person.employmentType]],
                  [
                    copy.phone,
                    person.phone && (
                      <a
                        className="tabular-nums underline underline-offset-4"
                        href={`tel:${person.phone}`}
                      >
                        {formatGhanaPhone(person.phone)}
                      </a>
                    ),
                  ],
                  [copy.email, person.email],
                ]}
              />
            </Panel>
          </div>
        )}
      </Loaded>
    </>
  );
}
