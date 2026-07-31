'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  buildMatchDecisionInsights,
  type MatchDecisionInsightsV1,
} from '@/lib/decision-layer-v1';
import {
  runDecisionEngineV1,
  type DecisionEngineV1Result,
  type MatchDecisionV1,
} from '@/lib/decision-engine-v1';
import type { EnrichmentSignalsLike } from '@/lib/enrichment-display-v1';
import {
  listProfiles,
  getProfileById,
  type ProfileListItem,
} from '@/lib/profiles-api';
import {
  listMatches,
  getMatchById,
  compareProfiles as compareProfilesApi,
  type MatchListItem,
  type CompareResult,
} from '@/lib/matches-api';

type DecisionCueV1 = 'TALK' | 'THINK' | 'SKIP';

function mapEngineDecisionToCue(d: MatchDecisionV1): DecisionCueV1 {
  if (d === 'STRONG_MATCH') return 'TALK';
  if (d === 'GOOD_MATCH') return 'THINK';
  return 'SKIP';
}

/** Main hero line (THINK → SLOW DOWN in UI only). */
const HERO_MAIN_LINE: Record<DecisionCueV1, string> = {
  TALK: 'TALK',
  THINK: 'SLOW DOWN',
  SKIP: 'SKIP',
};

const HERO_GLOSS: Record<DecisionCueV1, string> = {
  TALK: 'Worth meeting',
  THINK: 'Mixed signals',
  SKIP: 'Low fit',
};

/**
 * UI-only friendlier copy for generic engine tier fallbacks (engine strings unchanged).
 * Keys must match `pickPrimaryReason` in decision-engine-v1.ts.
 */
const PRIMARY_REASON_DISPLAY_FALLBACKS: Record<string, string> = {
  'Compatibility reading is strong overall.':
    'Score is high and several profile signals line up—worth a real conversation.',
  'Compatibility reading is solid overall.':
    'Score is healthy; still scan dealbreakers and day-to-day fit before you invest.',
  'Compatibility reading is only partial.':
    'Score is so-so—some overlap, but you will be negotiating real gaps.',
  'Compatibility reading is below the bar.':
    'Score is low enough that this is unlikely to feel easy or mutual.',
};

function displayPrimaryReasonForUi(raw: string): string {
  return PRIMARY_REASON_DISPLAY_FALLBACKS[raw] ?? raw;
}

/** Outer CTA shell; inner main + gloss. Tighter tracking on mobile. */
function matchDecisionCtaShellClass(cue: DecisionCueV1): string {
  const shell =
    'mx-auto flex w-full max-w-lg select-none flex-col items-center justify-center gap-1 rounded-2xl px-6 py-4 text-center sm:px-10 sm:py-6';
  if (cue === 'TALK') {
    return `${shell} bg-zinc-900 text-white shadow-lg ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900`;
  }
  if (cue === 'THINK') {
    return `${shell} border-2 border-zinc-900 bg-white text-zinc-900 shadow-md dark:border-zinc-200 dark:bg-zinc-950 dark:text-zinc-50`;
  }
  return `${shell} border border-zinc-300 bg-transparent py-3.5 text-zinc-500 shadow-none dark:border-zinc-600 dark:text-zinc-500`;
}

function matchDecisionMainLineClass(cue: DecisionCueV1): string {
  const tight = 'font-extrabold uppercase tracking-wide sm:tracking-wider';
  if (cue === 'TALK') {
    return `${tight} text-3xl sm:text-5xl`;
  }
  if (cue === 'THINK') {
    return `${tight} text-2xl leading-tight sm:text-4xl`;
  }
  return `${tight} text-2xl font-bold sm:text-4xl`;
}

function matchDecisionGlossClass(cue: DecisionCueV1): string {
  const base =
    'text-sm font-semibold leading-tight sm:text-base';
  if (cue === 'TALK') {
    return `${base} text-zinc-200 dark:text-zinc-600`;
  }
  if (cue === 'THINK') {
    return `${base} text-zinc-600 dark:text-zinc-400`;
  }
  return `${base} text-zinc-500 dark:text-zinc-500`;
}

function MatchDecisionBlock({ engine }: { engine: DecisionEngineV1Result }) {
  const cue = mapEngineDecisionToCue(engine.decision);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const primaryShown = displayPrimaryReasonForUi(engine.primaryReason);

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8"
      role="region"
      aria-label="Match decision"
      data-decision-cue={cue}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={matchDecisionCtaShellClass(cue)}
          role="status"
          aria-live="polite"
        >
          <span className={matchDecisionMainLineClass(cue)}>{HERO_MAIN_LINE[cue]}</span>
          <span className={matchDecisionGlossClass(cue)}>{HERO_GLOSS[cue]}</span>
        </div>
        <p
          className="mt-5 max-w-xl text-base font-semibold leading-snug text-zinc-600 dark:text-zinc-400 sm:text-lg line-clamp-2"
          title={primaryShown}
        >
          {primaryShown}
        </p>
        {engine.flags.length > 0 ? (
          <div className="mt-4 w-full max-w-xl">
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="text-sm font-medium text-zinc-600 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-expanded={detailsOpen}
            >
              {detailsOpen ? 'Hide details' : 'Show details'}
            </button>
            {detailsOpen ? (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {engine.flags.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {f}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MatchesPageClient() {
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
  const [decisionLayer, setDecisionLayer] = useState<MatchDecisionInsightsV1 | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [engineV1, setEngineV1] = useState<DecisionEngineV1Result | null>(null);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);
  const [scoreSortOrder, setScoreSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await listProfiles();
      setItems(data);
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
      const data = await listMatches();
      setMatchesList(data);
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

  const resultPairIds = useMemo(() => {
    if (!result) return { aId: '', bId: '' };
    const aId = result.aId ?? result.a?.id ?? '';
    const bId = result.bId ?? result.b?.id ?? '';
    return { aId: aId.trim(), bId: bId.trim() };
  }, [result]);

  useEffect(() => {
    const { aId, bId } = resultPairIds;
    if (!aId || !bId) {
      setDecisionLayer(null);
      setEngineV1(null);
      setDecisionLoading(false);
      return;
    }
    let cancelled = false;
    setDecisionLoading(true);
    setEngineV1(null);
    const load = async () => {
      try {
        const [pa, pb] = await Promise.all([
          getProfileById(aId),
          getProfileById(bId),
        ]);
        if (cancelled) return;
        const sa =
          pa?.evaluation?.enrichment?.signals
            ? (pa.evaluation.enrichment.signals as EnrichmentSignalsLike)
            : null;
        const sb =
          pb?.evaluation?.enrichment?.signals
            ? (pb.evaluation.enrichment.signals as EnrichmentSignalsLike)
            : null;
        setDecisionLayer(buildMatchDecisionInsights(sa, sb));

        const analyzed = result?.status !== 'NOT_ANALYZED';
        const rawScore = result?.finalScore;
        const compatibilityScore =
          typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;
        if (analyzed && compatibilityScore != null && sa != null && sb != null) {
          setEngineV1(
            runDecisionEngineV1({
              compatibilityScore,
              enrichment: { profileA: sa, profileB: sb },
            }),
          );
        } else {
          setEngineV1(null);
        }
      } catch {
        if (!cancelled) {
          setDecisionLayer(null);
          setEngineV1(null);
        }
      } finally {
        if (!cancelled) setDecisionLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    resultPairIds.aId,
    resultPairIds.bId,
    result?.matchId,
    result?.status,
    result?.finalScore,
    result?.finalScore,
  ]);

  async function handleSelectMatch(matchId: string) {
    setSelectedMatchId(matchId);
    setMatchDetailLoading(true);
    setCompareError(null);
    try {
      const data = await getMatchById(matchId);
      setResult(data);
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
    const score = (m: MatchListItem) => m.finalScore;
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
      const data = await compareProfilesApi(aId.trim(), bId.trim());
      setResult(data);
      if (data.status === 'READY') {
        setSelectedMatchId(data.matchId ?? null);
        fetchMatchesList();
      } else {
        setSelectedMatchId(null);
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
                        <td className="p-2 font-medium">{m.finalScore}</td>
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
                {result.status !== 'NOT_ANALYZED' && engineV1 && !decisionLoading ? (
                  <MatchDecisionBlock engine={engineV1} />
                ) : null}

                {result.status === 'NOT_ANALYZED' && (
                  <div
                    className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    role="status"
                  >
                    {result.message ?? 'Run analyze for both profiles before compare'}
                  </div>
                )}
                {(decisionLoading ||
                  Boolean(decisionLayer?.whyThisWorks || decisionLayer?.watchOutFor)) && (
                  <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Decide faster
                    </h2>
                    {decisionLoading ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading cues…</p>
                    ) : (
                      <dl className="space-y-3 text-sm">
                        {decisionLayer?.whyThisWorks ? (
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              Why this works
                            </dt>
                            <dd className="mt-1 font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                              {decisionLayer.whyThisWorks}
                            </dd>
                          </div>
                        ) : null}
                        {decisionLayer?.watchOutFor ? (
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                              Watch out for
                            </dt>
                            <dd className="mt-1 font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                              {decisionLayer.watchOutFor}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    )}
                  </div>
                )}

                <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Score
                  </h2>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100" data-score-source="api">
                    {result.status === 'NOT_ANALYZED'
                      ? '—'
                      : result.finalScore}
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

                {result.status !== 'NOT_ANALYZED' && (result.alignments?.length ?? 0) > 0 && (
                  <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Why it works
                    </h2>
                    <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {(result.alignments ?? []).map((a, i) => (
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

                {result.status !== 'NOT_ANALYZED' && (result.tensions?.length ?? 0) > 0 && (
                  <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Tensions
                    </h2>
                    <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {(result.tensions ?? []).map((t, i) => (
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
                  (result.alignments?.length ?? 0) === 0 &&
                  (result.tensions?.length ?? 0) === 0 && (
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
