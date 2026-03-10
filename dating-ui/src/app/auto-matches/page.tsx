'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_AUTO = 'http://localhost:3001/api/v1/matches/auto';
const API_REBUILD = 'http://localhost:3001/api/v1/matches/rebuild';

interface WhyTopEntry {
  key: string;
  text: string;
  direction: string;
}

interface TensionsTopEntry {
  key: string;
  text: string;
  gap: number;
  direction: string;
}

interface MatchIndexItem {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  overall: number;
  finalScore?: number;
  coverage: number;
  frictionRisk: number;
  whyTop: WhyTopEntry[];
  tensionsTop: TensionsTopEntry[];
  updatedAt: string;
}

interface MatchIndex {
  generatedAt: string;
  profileCount: number;
  matchCount: number;
  items: MatchIndexItem[];
}

function formatWhy(item: MatchIndexItem): string {
  if (!item.whyTop?.length) return '—';
  return item.whyTop.map((w) => w.text).join(' · ');
}

function formatTensions(item: MatchIndexItem): string {
  if (!item.tensionsTop?.length) return '—';
  return item.tensionsTop.map((t) => `${t.text} (Gap ${t.gap})`).join(' · ');
}

export default function AutoMatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<MatchIndex | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);

  const fetchAuto = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_AUTO);
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`,
        );
        setIndex(null);
        return;
      }
      if (data?.ok && data?.index) {
        setIndex(data.index);
      } else if (data?.ok === false && data?.message) {
        setError(data.message);
        setIndex(null);
      } else {
        setError('Invalid response from server.');
        setIndex(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
      setIndex(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuto();
  }, [fetchAuto]);

  async function handleRebuild() {
    setRebuildError(null);
    setRebuilding(true);
    try {
      const res = await fetch(API_REBUILD, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRebuildError(
          typeof data?.message === 'string' ? data.message : `Rebuild failed (${res.status})`,
        );
        return;
      }
      if (data?.ok && data?.stats) {
        await fetchAuto();
      } else {
        setRebuildError('Invalid response from server.');
      }
    } catch (err) {
      setRebuildError(err instanceof Error ? err.message : 'Rebuild failed.');
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Auto Matches
          </h1>
          <button
            type="button"
            onClick={handleRebuild}
            disabled={loading || rebuilding}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {rebuilding ? 'Rebuilding…' : 'Rebuild matches'}
          </button>
        </div>

        {rebuildError && (
          <div
            className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {rebuildError}
          </div>
        )}

        {loading && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading auto matches…</p>
        )}

        {error && !loading && (
          <div
            className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {!loading && !error && index && index.items.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No auto matches yet. Run &quot;Rebuild matches&quot; after adding profiles.
          </p>
        )}

        {!loading && !error && index && index.items.length > 0 && (
          <>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Generated {index.matchCount} matches from {index.profileCount} profiles at{' '}
              {new Date(index.generatedAt).toLocaleString()}. Sorted by score.
            </p>
            <div className="overflow-x-auto rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="p-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Match (A / B)
                    </th>
                    <th className="p-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Score
                    </th>
                    <th className="p-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Why
                    </th>
                    <th className="p-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Tensions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {index.items.map((item) => (
                    <tr
                      key={item.matchId}
                      className="cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                      onClick={() => {
                        const url = `/matches?prefillA=${encodeURIComponent(item.a.id)}&prefillB=${encodeURIComponent(item.b.id)}`;
                        router.push(url);
                      }}
                    >
                      <td className="p-3 text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium">{item.a.name}</span>
                        <span className="text-zinc-500 dark:text-zinc-400"> / </span>
                        <span className="font-medium">{item.b.name}</span>
                      </td>
                      <td className="p-3 font-medium tabular-nums">
                        {item.finalScore ?? item.overall}
                      </td>
                      <td className="max-w-[240px] p-3 text-zinc-600 dark:text-zinc-400">
                        {formatWhy(item)}
                      </td>
                      <td className="max-w-[240px] p-3 text-zinc-600 dark:text-zinc-400">
                        {formatTensions(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
