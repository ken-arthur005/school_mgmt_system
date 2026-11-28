import { PHOTO_CONTENT_TYPE, PHOTO_MAX_BYTES, PHOTO_MAX_PIXELS } from '@school-mgmt/shared';

/** The size to draw a picture so neither side is longer than `max`. Never enlarges. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, PHOTO_CONTENT_TYPE, quality);
  });

/**
 * Shrinks a camera photo to a small JPEG before it is sent, which saves data. Redrawing it also
 * drops the hidden details a phone stores in a photo, such as where it was taken.
 */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = document.createElement('canvas');
    Object.assign(canvas, fitWithin(image.width, image.height, PHOTO_MAX_PIXELS));
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('This browser cannot prepare photos.');
    // JPEG has no see-through parts: draw them white.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.7, 0.5]) {
      const jpeg = await toJpeg(canvas, quality);
      if (jpeg !== null && jpeg.size <= PHOTO_MAX_BYTES) return jpeg;
    }
    throw new Error('This photo could not be made small enough.');
  } finally {
    image.close();
  }
}
