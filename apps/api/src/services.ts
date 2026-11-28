import type { Db } from '@school-mgmt/db';
import type { FastifyBaseLogger } from 'fastify';
import type { PhotoStorage } from './modules/photos/storage';

/** What every module's service needs. */
export interface Services {
  db: Db;
  photos: PhotoStorage;
  log: FastifyBaseLogger;
}

/** Turns a stored photo path into a link the app can show. */
export type PhotoLinker = (path: string | null) => string | null;

/**
 * Signs all the photos a response needs in one go. If storage is unreachable the page still
 * loads, just without pictures.
 */
export async function photoLinks(
  services: Services,
  paths: readonly (string | null)[],
): Promise<PhotoLinker> {
  const wanted = [...new Set(paths.filter((path) => path !== null))];
  let urls = new Map<string, string>();
  if (wanted.length > 0) {
    try {
      urls = await services.photos.signedUrls(wanted);
    } catch (error) {
      services.log.warn({ err: error }, 'could not sign photo links');
    }
  }
  return (path) => (path === null ? null : (urls.get(path) ?? null));
}
