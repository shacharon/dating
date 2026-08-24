'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminPhotoBlob,
  listPendingPhotos,
  moderatePhoto,
  type PendingPhotoListItem,
  type RejectionReasonCode,
} from '@/lib/admin/admin-photos-api';

type RowState = PendingPhotoListItem & { previewUrl?: string };

const REASON_CODES: RejectionReasonCode[] = [
  'no_face',
  'explicit_content',
  'low_quality',
  'not_real_person',
  'other',
];

export default function AdminPhotosPage() {
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectCodeById, setRejectCodeById] = useState<
    Record<string, RejectionReasonCode>
  >({});
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>(
    {},
  );
  const [skipUntilId, setSkipUntilId] = useState<string | null>(null);

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

  const visibleRows =
    skipUntilId == null
      ? rows
      : (() => {
          const idx = rows.findIndex((r) => r.id === skipUntilId);
          return idx >= 0 ? rows.slice(idx + 1) : rows;
        })();

  async function onApprove(photoId: string) {
    setBusyId(photoId);
    setError(null);
    try {
      await moderatePhoto(photoId, 'approve');
      setSkipUntilId(null);
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
      await moderatePhoto(photoId, 'reject', {
        rejectionReasonCode: rejectCodeById[photoId] ?? 'other',
        rejectionReason: rejectReasonById[photoId],
      });
      setSkipUntilId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  }

  function onSkip(photoId: string) {
    setSkipUntilId(photoId);
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
        Pending + flagged uploads awaiting review (FIFO). Skip advances to the next
        item without a decision.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading queue…</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && visibleRows.length === 0 ? (
        <p className="text-sm text-zinc-500">No photos in the review queue.</p>
      ) : null}

      <ul className="space-y-6">
        {visibleRows.map((row) => (
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
                {row.status} · Uploaded {new Date(row.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">User {row.userId}</p>
              {row.mlConfidence != null || row.mlLabels.length > 0 ? (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  ML confidence{' '}
                  {row.mlConfidence != null ? row.mlConfidence.toFixed(1) : '—'}
                  {row.mlLabels.length > 0
                    ? ` · ${row.mlLabels.join(', ')}`
                    : ''}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  disabled={busyId === row.id}
                  onClick={() => void onApprove(row.id)}
                >
                  Approve
                </button>
                <select
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                  value={rejectCodeById[row.id] ?? 'other'}
                  onChange={(e) =>
                    setRejectCodeById((prev) => ({
                      ...prev,
                      [row.id]: e.target.value as RejectionReasonCode,
                    }))
                  }
                >
                  {REASON_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Optional note"
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
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
                  disabled={busyId === row.id}
                  onClick={() => onSkip(row.id)}
                >
                  Skip
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
