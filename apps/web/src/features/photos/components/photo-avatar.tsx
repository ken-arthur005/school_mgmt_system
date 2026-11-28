import { PHOTO_CONTENT_TYPE, photoResponseSchema } from '@school-mgmt/shared';
import { Camera } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/person';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/field';
import { api, errorMessage } from '@/lib/api';
import { useSave } from '@/lib/use-save';
import { cn } from '@/lib/utils';
import { photoCopy as copy } from '../copy';
import { shrinkPhoto } from '../resize';

class UnreadablePhoto extends Error {}

/** Saves or removes the photo at an API path such as `/students/<id>/photo`. */
function usePhoto(path: string) {
  return useSave(async (file: File | null) => {
    if (file === null) {
      return api(`${path}/remove`, photoResponseSchema, { method: 'POST' });
    }
    const jpeg = await shrinkPhoto(file).catch(() => {
      throw new UnreadablePhoto();
    });
    return api(path, photoResponseSchema, {
      method: 'PUT',
      file: new Blob([jpeg], { type: PHOTO_CONTENT_TYPE }),
    });
  });
}

/** A person's picture, with a camera button on it for those allowed to change it. */
export function PhotoAvatar({
  firstName,
  surname,
  photoUrl,
  path,
  className,
}: {
  firstName: string;
  surname: string;
  photoUrl: string | null;
  /** Leave out when the user may not change this photo. */
  path?: string | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const avatar = (
    <Avatar
      firstName={firstName}
      surname={surname}
      photoUrl={photoUrl}
      className={cn('size-24 text-3xl ring-4 ring-gold', className)}
    />
  );
  if (path === undefined) return avatar;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={photoUrl === null ? copy.add : copy.change}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 print:pointer-events-none"
      >
        {avatar}
        <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-panel print:hidden">
          <Camera className="size-5" aria-hidden />
        </span>
      </button>
      {open && (
        <PhotoDialog
          path={path}
          hasPhoto={photoUrl !== null}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function PhotoDialog({
  path,
  onClose,
  hasPhoto,
}: {
  path: string;
  onClose: () => void;
  hasPhoto: boolean;
}) {
  const photo = usePhoto(path);
  const save = (file: File | null) => {
    photo.mutate(file, {
      onSuccess: () => {
        toast.success(file === null ? copy.removed : copy.saved);
        onClose();
      },
    });
  };
  const problem =
    photo.error === null
      ? undefined
      : photo.error instanceof UnreadablePhoto
        ? copy.unreadable
        : errorMessage(photo.error);

  return (
    <Dialog onClose={onClose} title={copy.title} description={copy.description}>
      <FormError message={problem} />
      <label
        className={cn(
          buttonVariants({ size: 'lg' }),
          'cursor-pointer focus-within:ring-[3px] focus-within:ring-ring/60',
          photo.isPending && 'pointer-events-none opacity-50',
        )}
      >
        <Camera aria-hidden />
        {copy.choose}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={photo.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Lets the same file be chosen again after a failure.
            event.target.value = '';
            if (file !== undefined) save(file);
          }}
        />
      </label>
      {hasPhoto && (
        <Button
          variant="outline"
          busy={photo.isPending}
          onClick={() => {
            save(null);
          }}
        >
          {copy.remove}
        </Button>
      )}
    </Dialog>
  );
}
