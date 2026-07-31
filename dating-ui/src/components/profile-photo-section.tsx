'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  deleteMyProfilePhoto,
  fetchMyProfilePhotoBlob,
  listMyProfilePhotos,
  setPrimaryMyProfilePhoto,
  uploadMyProfilePhoto,
  type MeProfilePhotoDto,
} from '@/lib/me-photos-api';
import { useAppLocale } from '@/lib/i18n';
import {
  ProfilePhotoEmptySlot,
  ProfilePhotoFilledSlot,
} from '@/components/profile-photo-slot';

const MAX_PHOTOS = 3;

type UploadingPreview = {
  id: string;
  url: string;
};

export function ProfilePhotoSection({
  requiredForMatching = false,
}: {
  requiredForMatching?: boolean;
}) {
  const { copy } = useAppLocale();
  const photoGateCopy = copy.photoGate;
  const photosCopy = copy.profilePhotos;
  const moderationCopy = copy.photoModeration;

  const [photos, setPhotos] = useState<MeProfilePhotoDto[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function refreshPhotos() {
    const rows = await listMyProfilePhotos();
    rows.sort((a, b) => a.position - b.position);
    setPhotos(rows);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshPhotos();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : photosCopy.loadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const photo of photos) {
        try {
          const blob = await fetchMyProfilePhotoBlob(photo.id);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          next[photo.id] = url;
          created.push(url);
        } catch {
          // keep slot visible even if file read fails
        }
      }
      if (!cancelled) {
        setPreviewUrls((prev) => {
          Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
          return next;
        });
      } else {
        created.forEach((u) => URL.revokeObjectURL(u));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((u) => URL.revokeObjectURL(u));
      if (uploading?.url) URL.revokeObjectURL(uploading.url);
    };
  }, [previewUrls, uploading]);

  const canUpload = photos.length < MAX_PHOTOS && !uploading;
  const slots = useMemo(() => {
    const base = [...photos];
    while (base.length < MAX_PHOTOS) base.push(null as unknown as MeProfilePhotoDto);
    return base.slice(0, MAX_PHOTOS);
  }, [photos]);

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!canUpload) return;

    const localUrl = URL.createObjectURL(file);
    setUploading({ id: `up-${Date.now()}`, url: localUrl });
    try {
      await uploadMyProfilePhoto(file);
      await refreshPhotos();
    } catch (err) {
      setError(err instanceof Error ? err.message : photosCopy.uploadFailed);
    } finally {
      URL.revokeObjectURL(localUrl);
      setUploading(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onDelete(photoId: string) {
    setBusyPhotoId(photoId);
    setError(null);
    try {
      await deleteMyProfilePhoto(photoId);
      await refreshPhotos();
    } catch (e) {
      setError(e instanceof Error ? e.message : photosCopy.deleteFailed);
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function onSetPrimary(photoId: string) {
    setBusyPhotoId(photoId);
    setError(null);
    try {
      await setPrimaryMyProfilePhoto(photoId);
      await refreshPhotos();
    } catch (e) {
      setError(e instanceof Error ? e.message : photosCopy.setPrimaryFailed);
    } finally {
      setBusyPhotoId(null);
    }
  }

  return (
    <section
      id="profile-photos"
      className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {photosCopy.title}
          </h2>
          {requiredForMatching ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {photoGateCopy.requiredForMatchingHint}
            </p>
          ) : null}
        </div>
        <label
          className={`rounded border px-3 py-1.5 text-xs font-medium ${canUpload ? 'cursor-pointer border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800' : 'cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500'}`}
          aria-disabled={!canUpload}
        >
          {photosCopy.upload}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPickFile}
            disabled={!canUpload}
          />
        </label>
      </div>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {photosCopy.hint}
      </p>
      {loading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{photosCopy.loading}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        {slots.map((photo, idx) => {
          if (!photo) {
            const isUploading = uploading && idx === photos.length;
            return (
              <ProfilePhotoEmptySlot
                key={`slot-empty-${idx}`}
                uploadingUrl={isUploading ? uploading.url : undefined}
                photosCopy={photosCopy}
              />
            );
          }
          return (
            <ProfilePhotoFilledSlot
              key={photo.id}
              photo={photo}
              previewUrl={previewUrls[photo.id]}
              isBusy={busyPhotoId === photo.id}
              photosCopy={photosCopy}
              moderationCopy={moderationCopy}
              onDelete={onDelete}
              onSetPrimary={onSetPrimary}
            />
          );
        })}
      </div>
      {error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!canUpload ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {photosCopy.limitReached}
        </p>
      ) : null}
    </section>
  );
}
