import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Panel } from '@/components/panel';
import { PersonLink } from '@/components/person';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { Input } from '@/components/ui/field';
import { fullName } from '@/lib/labels';
import { staffCopy as copy } from '../copy';
import { useStaffList } from '../hooks';

export function StaffListScreen() {
  const staff = useStaffList();
  const [text, setText] = useState('');
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return (
    <>
      <PageHeader title={copy.title} help={copy.help} />
      <Input
        type="search"
        aria-label={copy.search}
        placeholder={copy.search}
        value={text}
        className="mb-4 rounded-full px-5"
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <Panel>
        <Loaded query={staff} skeleton={<ListSkeleton />}>
          {({ items }) => {
            // The whole list is already here, so it is filtered on the device.
            const shown = items.filter((person) => {
              const haystack = `${fullName(person)} ${person.jobTitle}`.toLowerCase();
              return words.every((word) => haystack.includes(word));
            });
            return shown.length === 0 ? (
              <EmptyState title={copy.empty} />
            ) : (
              <ul>
                {shown.map((person) => (
                  <li key={person.id}>
                    <PersonLink
                      to="/staff/$staffId"
                      params={{ staffId: person.id }}
                      firstName={person.firstName}
                      surname={person.surname}
                      photoUrl={person.photoUrl}
                      title={fullName(person)}
                      detail={person.jobTitle}
                    />
                  </li>
                ))}
              </ul>
            );
          }}
        </Loaded>
      </Panel>
    </>
  );
}
