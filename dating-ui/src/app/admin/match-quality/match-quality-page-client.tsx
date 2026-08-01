'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  formatPositiveRate,
  getMatchQualitySummary,
  listNegativeCandidates,
  MATCH_QUALITY_RUNBOOK_DOC_PATH,
  type MatchQualitySummary,
  type NegativeCandidateRow,
} from '@/lib/admin-match-quality-api';

const WINDOW_OPTIONS = [7, 30] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];

function truncateProfileId(id: string, max = 16): string {
  if (id.length <= max) {
    return id;
  }
  return `${id.slice(0, max)}…`;
}

export default function AdminMatchQualityPage() {
  const [windowDays, setWindowDays] = useState<WindowDays>(7);
  const [summary, setSummary] = useState<MatchQualitySummary | null>(null);
  const [rows, setRows] = useState<NegativeCandidateRow[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runbookUrl = process.env.NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL?.trim();

  const loadDashboard = useCallback(async (days: WindowDays) => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        getMatchQualitySummary(days),
        listNegativeCandidates(days, 20, 0),
      ]);
      setSummary(summaryRes);
      setRows(listRes.items);
      setListTotal(listRes.total);
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view match quality.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load match quality');
      }
      setSummary(null);
      setRows([]);
      setListTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(windowDays);
  }, [windowDays, loadDashboard]);

  async function onLoadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const listRes = await listNegativeCandidates(windowDays, 20, rows.length);
      setRows((prev) => [...prev, ...listRes.items]);
      setListTotal(listRes.total);
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view match quality.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load more candidates');
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const showTable = summary !== null && summary.feedbackCount > 0;

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
        Match quality
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Feedback health from match suggestion thumbs (Postgres aggregates).
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {WINDOW_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              windowDays === days
                ? 'bg-emerald-700 text-white'
                : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900/50'
            }`}
            onClick={() => setWindowDays(days)}
            disabled={loading}
          >
            {days} days
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading match quality…</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && summary ? (
        <>
          <p className="mb-4 text-xs text-zinc-500">
            Window: last {summary.windowDays} days
          </p>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Total feedback</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {summary.feedbackCount}
              </p>
            </div>
            <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Positive rate</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {formatPositiveRate(summary.positiveRate)}
              </p>
            </div>
            <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Distinct reporters</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {summary.distinctReporters}
              </p>
            </div>
          </div>

          {summary.feedbackCount === 0 ? (
            <div className="rounded border border-zinc-200 p-4 text-sm dark:border-zinc-700">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">No feedback yet</p>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Thumbs on match detail populate this dashboard once users submit feedback.
              </p>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Runbook:{' '}
                {runbookUrl ? (
                  <a
                    href={runbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline dark:text-emerald-400"
                  >
                    Match quality runbook
                  </a>
                ) : (
                  <code className="text-xs">{MATCH_QUALITY_RUNBOOK_DOC_PATH}</code>
                )}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {showTable ? (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Profile ID</th>
                <th className="px-3 py-2 font-medium">Negative count</th>
                <th className="px-3 py-2 font-medium">Distinct viewers</th>
                <th className="px-3 py-2 font-medium">Last negative</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.matchProfileId}
                  className="border-t border-zinc-200 dark:border-zinc-700"
                >
                  <td
                    className="px-3 py-2 font-mono"
                    title={row.matchProfileId}
                  >
                    {truncateProfileId(row.matchProfileId)}
                  </td>
                  <td className="px-3 py-2">{row.negativeCount}</td>
                  <td className="px-3 py-2">{row.distinctViewers}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(row.lastNegativeAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/match-quality/${encodeURIComponent(row.matchProfileId)}`}
                      className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                    >
                      View audit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length < listTotal ? (
            <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
              <button
                type="button"
                className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                disabled={loadingMore}
                onClick={() => void onLoadMore()}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
