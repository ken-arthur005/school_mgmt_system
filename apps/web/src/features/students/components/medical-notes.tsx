import { zodResolver } from '@hookform/resolvers/zod';
import { formatDate, type MedicalNote, medicalNoteCreateSchema, uuidv7 } from '@school-mgmt/shared';
import { HeartPulse, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Panel } from '@/components/panel';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Textarea } from '@/components/ui/field';
import { useCan } from '@/features/me/hooks';
import { errorMessage } from '@/lib/api';
import { studentCopy as copy } from '../copy';
import { useAddMedicalNote, useArchiveMedicalNote } from '../hooks';

function AddNoteDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const save = useAddMedicalNote(studentId);
  // One id per note, so pressing Save again after a lost connection can't add it twice.
  const [id] = useState(uuidv7);
  const { register, handleSubmit, formState } = useForm<z.input<typeof medicalNoteCreateSchema>>({
    resolver: zodResolver(medicalNoteCreateSchema),
    defaultValues: { id, note: '' },
  });
  const submit = handleSubmit((note) => {
    save.mutate(note, {
      onSuccess: () => {
        toast.success(copy.noteSaved);
        onClose();
      },
    });
  });

  return (
    <Dialog onClose={onClose} title={copy.addNote}>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <Field label={copy.noteLabel} hint={copy.noteHint} error={formState.errors.note?.message}>
          {(field) => <Textarea {...field} {...register('note')} maxLength={1000} />}
        </Field>
        <FormError message={save.error === null ? undefined : errorMessage(save.error)} />
        <Button type="submit" size="lg" busy={save.isPending}>
          {copy.saveNote}
        </Button>
      </form>
    </Dialog>
  );
}

export function MedicalNotes({
  studentId,
  notes,
}: {
  studentId: string;
  notes: readonly MedicalNote[];
}) {
  const mayEdit = useCan('medical_notes.edit');
  const [adding, setAdding] = useState(false);
  const archive = useArchiveMedicalNote();

  const remove = (noteId: string) => {
    archive.mutate(
      { noteId },
      {
        onSuccess: () =>
          toast(copy.noteRemoved, {
            action: {
              label: copy.undo,
              onClick: () =>
                void archive
                  .mutateAsync({ noteId, undo: true })
                  .then(() => toast.success(copy.noteRestored))
                  .catch((error: unknown) => toast.error(errorMessage(error))),
            },
          }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Panel
      title={copy.medical}
      action={
        mayEdit && (
          <Button
            variant="secondary"
            className="print:hidden"
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            {copy.addNote}
          </Button>
        )
      }
    >
      {notes.length === 0 ? (
        <p className="text-muted-foreground">{copy.noNotes}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start gap-3 rounded-lg bg-warning p-3 text-warning-foreground"
            >
              <HeartPulse className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{note.note}</p>
                <p className="text-sm">{copy.addedOn(formatDate(note.createdAt))}</p>
              </div>
              {mayEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-my-1 text-warning-foreground print:hidden"
                  aria-label={copy.removeNote}
                  disabled={archive.isPending}
                  onClick={() => {
                    remove(note.id);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <AddNoteDialog
          studentId={studentId}
          onClose={() => {
            setAdding(false);
          }}
        />
      )}
    </Panel>
  );
}
