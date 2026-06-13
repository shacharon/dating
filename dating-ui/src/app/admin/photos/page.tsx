'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminPhotoBlob,
  listPendingPhotos,
  moderatePhoto,
  type PendingPhotoListItem,
} from '@/lib/admin-photos-api';

type RowState = PendingPhotoListItem & { previewUrl?: string };

export default function AdminPhotosPage() {
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPendingPhotos();
      const withPreviews: RowState[] = [];
      for (const item of res.items) {
        try {
          const blob = await fetchAdminPhotoBlob(item.fileUrl);
          withPreviews.push({
            ...item,
            previewUrl: URL.createObjectURL(blob),
          });
        } catch {
          withPreviews.push(item);
        }
      }
      setRows(withPreviews);
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view the admin photo queue.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load queue');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      rows.forEach((row) => {
        if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup previews on unmount only
  }, [load]);

  async function onApprove(photoId: string) {
    setBusyId(photoId);
    setError(null);
    try {
      await moderatePhoto(photoId, 'approve');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(photoId: string) {
    setBusyId(photoId);
    setError(null);
    try {
      await moderatePhoto(photoId, 'reject', rejectReasonById[photoId]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="mb-4">
        <Link
          href="/admin"
          className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← Admin
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Photo moderation
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Pending uploads awaiting review (FIFO).
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading queue…</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No pending photos.</p>
      ) : null}

      <ul className="space-y-6">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-700 sm:flex-row"
          >
            <div className="h-32 w-32 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              {row.previewUrl ? (
                <img
                  src={row.previewUrl}
                  alt={row.originalFileName ?? 'Pending photo'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  No preview
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {row.originalFileName ?? 'Photo'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Uploaded {new Date(row.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">User {row.userId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  disabled={busyId === row.id}
                  onClick={() => void onApprove(row.id)}
                >
                  Approve
                </button>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Rejection reason (optional)"
                  className="min-w-[12rem] flex-1 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                  value={rejectReasonById[row.id] ?? ''}
                  onChange={(e) =>
                    setRejectReasonById((prev) => ({
                      ...prev,
                      [row.id]: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="rounded bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  disabled={busyId === row.id}
                  onClick={() => void onReject(row.id)}
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
