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
import { MatchCompareForm } from './match-compare-form';
import { MatchResultPanel } from './match-result-panel';
import { MatchesSidebar } from './matches-sidebar';

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
          <MatchesSidebar
            matchesLoading={matchesLoading}
            matchesError={matchesError}
            matchesList={matchesList}
            sortedMatchesList={sortedMatchesList}
            selectedMatchId={selectedMatchId}
            scoreSortOrder={scoreSortOrder}
            onToggleScoreSort={() =>
              setScoreSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
            }
            onSelectMatch={handleSelectMatch}
          />

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
                <MatchCompareForm
                  items={items}
                  aId={aId}
                  bId={bId}
                  canCompare={canCompare}
                  compareLoading={compareLoading}
                  onAIdChange={setAId}
                  onBIdChange={setBId}
                  onCompare={handleCompare}
                />

                {matchDetailLoading && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading match…
                  </p>
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
                  <MatchResultPanel
                    result={result}
                    engineV1={engineV1}
                    decisionLayer={decisionLayer}
                    decisionLoading={decisionLoading}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
