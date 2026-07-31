'use client';

import type { MeProfilePhotoDto } from '@/lib/me-photos-api';
import type { getCopy } from '@/lib/i18n';
import { statusBadgeClass, statusText } from '@/components/profile-photo-status';

type PhotosCopy = ReturnType<typeof getCopy>['profilePhotos'];
type ModerationCopy = ReturnType<typeof getCopy>['photoModeration'];

export function ProfilePhotoEmptySlot({
  uploadingUrl,
  photosCopy,
}: {
  uploadingUrl?: string;
  photosCopy: PhotosCopy;
}) {
  return (
    <div className="aspect-square rounded border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40">
      {uploadingUrl ? (
        <div className="relative h-full w-full">
          <img
            src={uploadingUrl}
            alt={photosCopy.uploadingPreviewAlt}
            className="h-full w-full rounded object-cover opacity-70"
          />
          <div className="absolute inset-x-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {photosCopy.uploading}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-zinc-400">
          {photosCopy.empty}
        </div>
      )}
    </div>
  );
}

export function ProfilePhotoFilledSlot({
  photo,
  previewUrl,
  isBusy,
  photosCopy,
  moderationCopy,
  onDelete,
  onSetPrimary,
}: {
  photo: MeProfilePhotoDto;
  previewUrl?: string;
  isBusy: boolean;
  photosCopy: PhotosCopy;
  moderationCopy: ModerationCopy;
  onDelete: (photoId: string) => void;
  onSetPrimary: (photoId: string) => void;
}) {
  return (
    <div
      className={`relative aspect-square overflow-hidden rounded border ${photo.isPrimary ? 'border-zinc-900 dark:border-zinc-200' : 'border-zinc-300 dark:border-zinc-700'}`}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={photo.originalFileName ?? photosCopy.photoAlt(photo.position + 1)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-zinc-400">
          {photosCopy.noPreview}
        </div>
      )}
      <div
        className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] ${statusBadgeClass(photo.status)}`}
      >
        {statusText(photo.status, moderationCopy)}
      </div>
      {photo.status === 'REJECTED' && photo.rejectionReason ? (
        <div className="absolute inset-x-1 bottom-10 rounded bg-red-950/80 px-1.5 py-1 text-[10px] text-red-50">
          {moderationCopy.rejectionPrefix} {photo.rejectionReason}
        </div>
      ) : null}
      {photo.isPrimary ? (
        <div className="absolute right-1 top-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
          {photosCopy.primary}
        </div>
      ) : null}
      <div className="absolute inset-x-1 bottom-1 flex gap-1">
        <button
          type="button"
          className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white disabled:opacity-50"
          onClick={() => void onDelete(photo.id)}
          disabled={isBusy}
        >
          {photosCopy.delete}
        </button>
        <button
          type="button"
          className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white disabled:opacity-50"
          onClick={() => void onSetPrimary(photo.id)}
          disabled={isBusy || photo.isPrimary || photo.status !== 'APPROVED'}
        >
          {photosCopy.setPrimary}
        </button>
      </div>
    </div>
  );
}
