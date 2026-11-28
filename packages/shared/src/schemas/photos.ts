import { z } from 'zod';
import { photoUrlSchema } from './common';

/** Photos are shrunk on the phone to a JPEG no longer than this on either side. */
export const PHOTO_MAX_PIXELS = 512;
/** The API refuses anything bigger; a 512 px JPEG is far smaller. */
export const PHOTO_MAX_BYTES = 300 * 1024;
export const PHOTO_CONTENT_TYPE = 'image/jpeg';

export const photoResponseSchema = z.object({ photoUrl: photoUrlSchema });
export type PhotoResponse = z.infer<typeof photoResponseSchema>;
