import { useState } from 'react';
import { PersonButton } from '@/components/person';
import { EmptyState, ListSkeleton, Loaded } from '@/components/states';
import { Field, Input } from '@/components/ui/field';
import { fullName } from '@/lib/labels';
import { useDebounced } from '@/lib/use-debounced';
import { useStudentSearch } from '../hooks';

export interface PickedStudent {
  id: string;
  name: string;
}

/** Search for a student and choose one, inside a form. */
export function StudentPicker({
  exclude,
  onPick,
}: {
  /** Students who can't be chosen (already there). */
  exclude: readonly string[];
  onPick: (student: PickedStudent) => void;
}) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const search = useStudentSearch(q);
  return (
    <div className="flex flex-col gap-2">
      <Field label="Find the student">
        {(field) => (
          <Input
            {...field}
            type="search"
            value={text}
            maxLength={100}
            placeholder="Name or admission number"
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        )}
      </Field>
      {q !== '' && (
        <Loaded query={search} skeleton={<ListSkeleton rows={3} />}>
          {({ items }) => {
            const choices = items.filter((student) => !exclude.includes(student.id));
            return choices.length === 0 ? (
              <EmptyState title="No student matches." />
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {choices.map((student) => (
                  <li key={student.id}>
                    <PersonButton
                      firstName={student.firstName}
                      surname={student.surname}
                      photoUrl={student.photoUrl}
                      title={fullName(student)}
                      detail={student.className ?? student.admissionNumber}
                      onClick={() => {
                        onPick({ id: student.id, name: fullName(student) });
                      }}
                    />
                  </li>
                ))}
              </ul>
            );
          }}
        </Loaded>
      )}
    </div>
  );
}
