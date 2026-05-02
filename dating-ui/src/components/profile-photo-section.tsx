'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  deleteMyProfilePhoto,
  fetchMyProfilePhotoBlob,
  listMyProfilePhotos,
  setPrimaryMyProfilePhoto,
  uploadMyProfilePhoto,
  type MeProfilePhotoDto,
} from '@/lib/me-profile-api';

const MAX_PHOTOS = 3;

type UploadingPreview = {
  id: string;
  url: string;
};

function statusLabel(status: MeProfilePhotoDto['status']): string {
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
}

export function ProfilePhotoSection() {
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
          setError(e instanceof Error ? e.message : 'Failed to load photos');
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
      setError(err instanceof Error ? err.message : 'Upload failed');
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
      setError(e instanceof Error ? e.message : 'Delete failed');
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
      setError(e instanceof Error ? e.message : 'Could not set primary');
    } finally {
      setBusyPhotoId(null);
    }
  }

  return (
    <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Photos
        </h2>
        <label
          className={`rounded border px-3 py-1.5 text-xs font-medium ${canUpload ? 'cursor-pointer border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800' : 'cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500'}`}
          aria-disabled={!canUpload}
        >
          Upload
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
        Up to 3 photos. One primary photo.
      </p>
      {loading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading photos…</p>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        {slots.map((photo, idx) => {
          if (!photo) {
            const isUploading = uploading && idx === photos.length;
            return (
              <div
                key={`slot-empty-${idx}`}
                className="aspect-square rounded border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40"
              >
                {isUploading ? (
                  <div className="relative h-full w-full">
                    <img
                      src={uploading.url}
                      alt="Uploading preview"
                      className="h-full w-full rounded object-cover opacity-70"
                    />
                    <div className="absolute inset-x-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      uploading
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    Empty
                  </div>
                )}
              </div>
            );
          }
          const preview = previewUrls[photo.id];
          const isBusy = busyPhotoId === photo.id;
          return (
            <div
              key={photo.id}
              className={`relative aspect-square overflow-hidden rounded border ${photo.isPrimary ? 'border-zinc-900 dark:border-zinc-200' : 'border-zinc-300 dark:border-zinc-700'}`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={photo.originalFileName ?? `Photo ${photo.position + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  No preview
                </div>
              )}
              <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {statusLabel(photo.status)}
              </div>
              {photo.isPrimary ? (
                <div className="absolute right-1 top-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
                  primary
                </div>
              ) : null}
              <div className="absolute inset-x-1 bottom-1 flex gap-1">
                <button
                  type="button"
                  className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white disabled:opacity-50"
                  onClick={() => void onDelete(photo.id)}
                  disabled={isBusy}
                >
                  delete
                </button>
                <button
                  type="button"
                  className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white disabled:opacity-50"
                  onClick={() => void onSetPrimary(photo.id)}
                  disabled={
                    isBusy || photo.isPrimary || photo.status !== 'APPROVED'
                  }
                >
                  set primary
                </button>
              </div>
            </div>
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
          Photo limit reached.
        </p>
      ) : null}
    </section>
  );
}
