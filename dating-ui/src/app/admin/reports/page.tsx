'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminReport,
  listAdminReports,
  updateAdminReport,
  type AdminReportDetail,
  type AdminReportListItem,
} from '@/lib/admin-reports-api';

export default function AdminReportsPage() {
  const [rows, setRows] = useState<AdminReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [opsNote, setOpsNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminReports('OPEN');
      setRows(res.items);
      if (selectedId && !res.items.some((row) => row.id === selectedId)) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view the admin report queue.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setOpsNote('');
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const row = await getAdminReport(selectedId);
        if (!cancelled) {
          setDetail(row);
          setOpsNote(row.opsNote ?? '');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load report detail');
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function resolve(status: 'DISMISSED' | 'ACTION_TAKEN') {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await updateAdminReport(selectedId, status, opsNote);
      setSelectedId(null);
      setDetail(null);
      setOpsNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-4">
        <Link
          href="/admin"
          className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← Admin
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        User reports
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Open reports awaiting triage (newest first).
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading reports…</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No open reports.</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Reporter</th>
                <th className="px-3 py-2 font-medium">Reported</th>
                <th className="px-3 py-2 font-medium">Context</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-t border-zinc-200 dark:border-zinc-700 ${
                    selectedId === row.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/30'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{row.reason}</td>
                  <td className="px-3 py-2 font-mono">{row.reporterUserId}</td>
                  <td className="px-3 py-2 font-mono">{row.reportedUserId}</td>
                  <td className="px-3 py-2">{row.contextType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
          {!selectedId ? (
            <p className="text-sm text-zinc-500">Select a report to view details.</p>
          ) : detailLoading ? (
            <p className="text-sm text-zinc-500">Loading detail…</p>
          ) : detail ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Reason:</span>{' '}
                {detail.reason}
              </p>
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Details:</span>{' '}
                {detail.details ?? '(none)'}
              </p>
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Context:</span>{' '}
                <a
                  href={detail.contextPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline dark:text-emerald-400"
                >
                  Open {detail.contextType.toLowerCase()}
                </a>
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Ops note (optional, max 500)
                </span>
                <textarea
                  className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                  rows={3}
                  maxLength={500}
                  value={opsNote}
                  onChange={(e) => setOpsNote(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void resolve('DISMISSED')}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void resolve('ACTION_TAKEN')}
                >
                  Mark action taken
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
