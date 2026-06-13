'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMyMatches,
  submitMyProfileForAnalysis,
  type MeMatchesListDto,
} from '@/lib/me-profile-api';
import { MatchPhoto } from '@/components/match-photo';
import { MatchListEmptyState } from '@/components/match-list-empty-state';
import { useAppLocale } from '@/lib/i18n';
import {
  matchListPrimaryLabel,
  matchListSecondaryMeta,
} from './match-display';

function matchActionBadge(
  action: NonNullable<
    NonNullable<MeMatchesListDto['matches']>[number]['yourAction']
  >,
  copy: ReturnType<typeof useAppLocale>['copy']['matches']['list']['actionBadge'],
) {
  switch (action) {
    case 'LIKE':
      return copy.liked;
    case 'PASS':
      return copy.passed;
    case 'BLOCK':
      return copy.blocked;
  }
}

export default function MeMatchesPage() {
  const router = useRouter();
  const { locale, copy } = useAppLocale();
  const listCopy = copy.matches.list;
  const [data, setData] = useState<MeMatchesListDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const dto = await fetchMyMatches();
    if (dto.status === 'not_ready') {
      if (dto.reason === 'no_profile') router.replace('/onboarding');
      else if (dto.reason === 'no_photo') router.replace('/dating/profile');
      else router.replace('/dating/analysis');
      return;
    }
    setData(dto);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyMatches()
      .then((dto) => {
        if (cancelled) return;
        if (dto.status === 'not_ready') {
          if (dto.reason === 'no_profile') router.replace('/onboarding');
          else if (dto.reason === 'no_photo') router.replace('/dating/profile');
          else router.replace('/dating/analysis');
          return;
        }
        setData(dto);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : listCopy.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, listCopy.loadFailed]);

  const matches = data?.status === 'ready' ? (data.matches ?? []) : [];

  const handleRefreshAnalysis = async () => {
    setRefreshBusy(true);
    setRefreshError(null);
    setRefreshSuccess(null);
    try {
      await submitMyProfileForAnalysis();
      setRefreshSuccess(listCopy.refreshStarted);
      await loadMatches();
    } catch (e: unknown) {
      setRefreshError(e instanceof Error ? e.message : listCopy.refreshFailed);
    } finally {
      setRefreshBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">

        <nav className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/dating/analysis"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {listCopy.backToAnalysis}
          </Link>
          <Link
            href="/onboarding/basic?edit=1"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {listCopy.editProfile}
          </Link>
        </nav>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {listCopy.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {listCopy.subtitle}
          </p>
        </header>

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {copy.common.loading}
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          data?.status === 'ready' &&
          data.viewerProfileAnalysisStale === true && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/40"
              role="region"
              aria-label={listCopy.staleRegionAria}
            >
              <p className="text-sm text-amber-900 dark:text-amber-100">
                {listCopy.staleMessage}
              </p>
              <button
                type="button"
                data-testid="matches-refresh-analysis"
                className="mt-3 rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
                disabled={refreshBusy}
                onClick={() => void handleRefreshAnalysis()}
              >
                {listCopy.refreshAnalysis}
              </button>
            </div>
          )}

        {!loading && !error && refreshSuccess && (
          <p
            className="text-sm text-emerald-800 dark:text-emerald-200"
            role="status"
            data-testid="matches-refresh-success"
          >
            {refreshSuccess}
          </p>
        )}
        {!loading && !error && refreshError && (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
            {refreshError}
          </p>
        )}

        {!loading && !error && matches.length === 0 && (
          <MatchListEmptyState />
        )}

        {!loading && !error && matches.length > 0 && (
          <ul className="flex flex-col gap-3">
            {matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/dating/me-matches/${m.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <div className="flex items-center gap-4">
                    <MatchPhoto
                      variant="list"
                      photoUrl={m.primaryPhotoUrl ?? null}
                      displayName={matchListPrimaryLabel(m)}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      {(() => {
                        const secondary = matchListSecondaryMeta(m);
                        return (
                          <>
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {matchListPrimaryLabel(m)}
                            </p>
                            {secondary && (
                              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {secondary}
                              </p>
                            )}
                          </>
                        );
                      })()}
                      {m.explainability?.reasonShort && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {m.explainability.reasonShort}
                        </p>
                      )}
                      {m.analyzedAt && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {listCopy.analyzedPrefix}{' '}
                          {new Date(m.analyzedAt).toLocaleDateString(locale, {
                            dateStyle: 'medium',
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.yourAction != null && (() => {
                        const badge = matchActionBadge(
                          m.yourAction,
                          listCopy.actionBadge,
                        );
                        return (
                          <span
                            className={
                              m.yourAction === 'LIKE'
                                ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : m.yourAction === 'PASS'
                                  ? 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                  : 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            }
                            aria-label={badge.ariaLabel}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                      {m.matchScore != null && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {m.matchScore}
                        </span>
                      )}
                      <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
