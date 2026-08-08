export const PHOTO_MODERATION_QUEUE = 'photo-moderation';

export type PhotoModerationJobData = {
  photoId: string;
};

/** Stable Bull jobId — duplicate pending/active enqueues coalesce. */
export function photoModerationJobId(photoId: string): string {
  return `photo-mod:${photoId}`;
}
