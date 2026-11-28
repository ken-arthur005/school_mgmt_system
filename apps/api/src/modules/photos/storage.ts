import { createClient } from '@supabase/supabase-js';
import { PHOTO_CONTENT_TYPE, PHOTO_MAX_BYTES } from '@school-mgmt/shared';

export const PHOTO_BUCKET = 'photos';
/** Long enough to look at a page, short enough that a copied link soon stops working. */
const SIGNED_URL_SECONDS = 10 * 60;

/** Where photo files live. Tests pass an in-memory one. */
export interface PhotoStorage {
  upload: (path: string, bytes: Buffer) => Promise<void>;
  /** Short-lived links, keyed by path. A path that can't be signed is left out. */
  signedUrls: (paths: readonly string[]) => Promise<Map<string, string>>;
}

function storageClient(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
}

export function supabasePhotoStorage(url: string, secretKey: string): PhotoStorage {
  const bucket = storageClient(url, secretKey).from(PHOTO_BUCKET);
  return {
    upload: async (path, bytes) => {
      const { error } = await bucket.upload(path, bytes, {
        contentType: PHOTO_CONTENT_TYPE,
        upsert: false,
      });
      if (error !== null) throw new Error(`Photo upload failed: ${error.message}`);
    },
    signedUrls: async (paths) => {
      const { data, error } = await bucket.createSignedUrls([...paths], SIGNED_URL_SECONDS);
      if (error !== null) throw new Error(`Photo links failed: ${error.message}`);
      return new Map(
        data.flatMap((item) =>
          item.path === null || item.signedUrl === null ? [] : [[item.path, item.signedUrl]],
        ),
      );
    },
  };
}

/** Creates the private bucket, or brings its limits up to date. Run by `storage:setup`. */
export async function ensurePhotoBucket(
  url: string,
  secretKey: string,
): Promise<'created' | 'updated'> {
  const storage = storageClient(url, secretKey);
  const options = {
    public: false,
    fileSizeLimit: PHOTO_MAX_BYTES,
    allowedMimeTypes: [PHOTO_CONTENT_TYPE],
  };
  const existing = await storage.getBucket(PHOTO_BUCKET);
  const result =
    existing.data === null
      ? await storage.createBucket(PHOTO_BUCKET, options)
      : await storage.updateBucket(PHOTO_BUCKET, options);
  if (result.error !== null) throw new Error(`Bucket setup failed: ${result.error.message}`);
  return existing.data === null ? 'created' : 'updated';
}
