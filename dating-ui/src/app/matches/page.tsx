'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_PROFILES = 'http://localhost:3001/api/v1/profiles';
const API_MATCHES = 'http://localhost:3001/api/v1/matches';
const API_COMPARE = 'http://localhost:3001/api/v1/matches/compare';

interface ProfileListItem {
  id: string;
  name: string;
  savedAt: string;
}

interface CompareAlignment {
  key: string;
  pairScore: number;
}

interface CompareTension {
  key: string;
  gap: number;
  text: string;
}

interface CompareResult {
  status?: 'READY' | 'NOT_ANALYZED';
  message?: string;
  /** @deprecated Use finalScore instead. */
  overall: number | null;
  finalScore?: number | null;
  aToB?: number | null;
  bToA?: number | null;
  relationshipStyle?: number | null;
  coverage?: number | null;
  frictionRisk?: number | null;
  compatibility?: number | null;
  friction?: number | null;
  coveragePercent?: number | null;
  coverageFactor?: number | null;
  alignments?: CompareAlignment[];
  tensions?: CompareTension[];
}

interface MatchListItem {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  /** Use finalScore for display; API returns engine finalScore. */
  overall: number;
  finalScore?: number;
  updatedAt: string;
}

export default function MatchesPage() {
  const searchParams = useSearchParams();
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<ProfileListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesList, setMatchesList] = useState<MatchListItem[]>([]);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);
  const [scoreSortOrder, setScoreSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(API_PROFILES);
      const data = await res.json();
      if (!res.ok) {
        setListError(
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`,
        );
        setItems([]);
        return;
      }
      if (data?.ok && Array.isArray(data?.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Request failed.');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Prefill A/B from query when coming from auto-matches (only if not yet set)
  useEffect(() => {
    if (listLoading || items.length === 0) return;
    const prefillA = searchParams.get('prefillA');
    const prefillB = searchParams.get('prefillB');
    if (prefillA && items.some((p) => p.id === prefillA)) setAId((prev) => (prev ? prev : prefillA));
    if (prefillB && items.some((p) => p.id === prefillB)) setBId((prev) => (prev ? prev : prefillB));
  }, [listLoading, items, searchParams]);

  const fetchMatchesList = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const res = await fetch(API_MATCHES);
      const data = await res.json();
      if (!res.ok) {
        setMatchesError(
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`,
        );
        setMatchesList([]);
        return;
      }
      if (data?.ok && Array.isArray(data?.items)) {
        setMatchesList(data.items);
      } else {
        setMatchesList([]);
      }
    } catch (err) {
      setMatchesError(err instanceof Error ? err.message : 'Request failed.');
      setMatchesList([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchesList();
  }, [fetchMatchesList]);

  async function handleSelectMatch(matchId: string) {
    setSelectedMatchId(matchId);
    setMatchDetailLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(`${API_MATCHES}/${encodeURIComponent(matchId)}`);
      const data = await res.json();
      if (!res.ok) {
        setCompareError(
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`,
        );
        setResult(null);
        return;
      }
      if (data?.ok && data?.match) {
        setResult({
          ...data.match,
          status: data.status ?? 'READY',
          message: typeof data?.message === 'string' ? data.message : undefined,
        });
      } else {
        setResult(null);
      }
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Request failed.');
      setResult(null);
    } finally {
      setMatchDetailLoading(false);
    }
  }

  const canCompare =
    aId.trim() !== '' &&
    bId.trim() !== '' &&
    aId.trim() !== bId.trim();

  const sortedMatchesList = useMemo(() => {
    const score = (m: MatchListItem) => m.finalScore ?? m.overall;
    return [...matchesList].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      return scoreSortOrder === 'desc' ? sb - sa : sa - sb;
    });
  }, [matchesList, scoreSortOrder]);

  async function handleCompare() {
    if (!canCompare) return;
    setCompareError(null);
    setResult(null);
    setCompareLoading(true);
    try {
      const res = await fetch(API_COMPARE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aId: aId.trim(), bId: bId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompareError(
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`,
        );
        return;
      }
      if (data?.ok && data?.match) {
        setResult({
          ...data.match,
          status: data.status ?? 'READY',
          message: typeof data?.message === 'string' ? data.message : undefined,
        });
        if (data.status === 'READY') {
          setSelectedMatchId(data.match.matchId);
          fetchMatchesList();
        } else {
          setSelectedMatchId(null);
        }
      } else {
        setCompareError('Invalid response from server.');
      }
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setCompareLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Matches
        </h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Sidebar: recent matches */}
          <aside className="w-full shrink-0 lg:w-72">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recent matches
            </h2>
            {matchesLoading && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            )}
            {matchesError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {matchesError}
              </p>
            )}
            {!matchesLoading && matchesList.length === 0 && !matchesError && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No matches yet. Compare two profiles above.
              </p>
            )}
            {!matchesLoading && matchesList.length > 0 && (
              <div className="overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="p-2 font-medium text-zinc-700 dark:text-zinc-300">
                        A / B
                      </th>
                      <th
                        role="button"
                        tabIndex={0}
                        onClick={() => setScoreSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setScoreSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                          }
                        }}
                        className="p-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                        aria-sort={scoreSortOrder === 'desc' ? 'descending' : 'ascending'}
                      >
                        Score {scoreSortOrder === 'desc' ? '↓' : '↑'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMatchesList.map((m) => (
                      <tr
                        key={m.matchId}
                        onClick={() => handleSelectMatch(m.matchId)}
                        className={`cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
                          selectedMatchId === m.matchId ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                        }`}
                      >
                        <td className="p-2 text-zinc-600 dark:text-zinc-400">
                          {m.a.name} / {m.b.name}
                        </td>
                        <td className="p-2 font-medium">{m.finalScore ?? m.overall}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </aside>

          {/* Main: compare form + result */}
          <div className="min-w-0 flex-1 space-y-6">
            {listLoading && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            )}
                {listError && (
              <div
                className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {listError}
              </div>
            )}
            {!listLoading && items.length === 0 && !listError && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No saved profiles found. Save profiles from Evaluate first.
              </p>
            )}

            {!listLoading && items.length > 0 && (
          <>
            <div className="space-y-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <div>
                <label
                  htmlFor="profile-a"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Profile A
                </label>
                <select
                  id="profile-a"
                  value={aId}
                  onChange={(e) => setAId(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (#{item.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="profile-b"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Profile B
                </label>
                <select
                  id="profile-b"
                  value={bId}
                  onChange={(e) => setBId(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (#{item.id})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCompare}
                disabled={!canCompare || compareLoading}
                className="w-full rounded bg-zinc-900 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {compareLoading ? 'Comparing…' : 'Compare'}
              </button>
            </div>

            {matchDetailLoading && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading match…</p>
            )}

            {compareError && (
              <div
                className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {compareError}
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.status === 'NOT_ANALYZED' && (
                  <div
                    className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    role="status"
                  >
                    {result.message ?? 'Run analyze for both profiles before compare'}
                  </div>
                )}
                <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Score
                  </h2>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100" data-score-source="api">
                    {result.status === 'NOT_ANALYZED'
                      ? '—'
                      : (result.finalScore ?? result.overall)}
                  </p>
                  {result.status !== 'NOT_ANALYZED' && (
                    <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">A → B</span>
                      <span className="font-medium">{result.aToB}</span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">B → A</span>
                      <span className="font-medium">{result.bToA}</span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">Relationship</span>
                      <span className="font-medium">{result.relationshipStyle}</span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">Coverage %</span>
                      <span className="font-medium">{result.coveragePercent ?? result.coverage}</span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {result.friction != null ? 'Friction (0–10)' : 'Friction risk'}
                      </span>
                      <span className="font-medium">{result.friction ?? result.frictionRisk}</span>
                    </li>
                    {result.compatibility != null && (
                      <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                        <span className="text-zinc-600 dark:text-zinc-400">Compatibility</span>
                        <span className="font-medium">{result.compatibility}</span>
                      </li>
                    )}
                    </ul>
                  )}
                </div>

                {result.status !== 'NOT_ANALYZED' && result.alignments?.length > 0 && (
                  <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Why it works
                    </h2>
                    <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {result.alignments.map((a, i) => (
                        <li key={i}>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {a.key}
                          </span>{' '}
                          (score {a.pairScore})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.status !== 'NOT_ANALYZED' && result.tensions?.length > 0 && (
                  <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Tensions
                    </h2>
                    <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {result.tensions.map((t, i) => (
                        <li key={i}>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {t.key}
                          </span>{' '}
                          — Gap ({t.gap}). {t.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.status !== 'NOT_ANALYZED' &&
                  result.alignments?.length === 0 &&
                  result.tensions?.length === 0 && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No alignments or tensions to show.
                  </p>
                )}
              </div>
            )}
          </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
