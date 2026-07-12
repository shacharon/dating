'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
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
import { formatHardBlockReason } from './hard-block-display';
import { useInfiniteMatches } from './use-infinite-matches';
import { formatSharedInterestNote } from '@/lib/enrichment-display-v1';

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
  const { locale, copy } = useAppLocale();
  const listCopy = copy.matches.list;
  const {
    data,
    matches,
    loading,
    loadingMore,
    error,
    hasMore,
    reload,
    sentinelRef,
  } = useInfiniteMatches(listCopy.loadFailed);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null);

  const handleRefreshAnalysis = async () => {
    setRefreshBusy(true);
    setRefreshError(null);
    setRefreshSuccess(null);
    try {
      await submitMyProfileForAnalysis();
      setRefreshSuccess(listCopy.refreshStarted);
      await reload();
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

        {!loading && !error && matches.length === 0 && <MatchListEmptyState />}

        {!loading && !error && matches.length > 0 && (
          <ul className="flex flex-col gap-3">
            {matches.map((m, index) => {
              const hardBlocked = m.hardBlocked;
              return (
                <li key={m.id}>
                  <Link
                    href={`/dating/me-matches/${m.id}`}
                    className={
                      hardBlocked
                        ? 'block rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20'
                        : 'block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
                    }
                  >
                    <div className="flex items-start gap-4">
                      <MatchPhoto
                        variant="list"
                        photoUrl={m.primaryPhotoUrl ?? null}
                        displayName={matchListPrimaryLabel(m)}
                        priority={index < 3}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {matchListPrimaryLabel(m)}
                        </p>
                        {hardBlocked && m.yourAction === 'LIKE' && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-300">
                            {listCopy.hardBlocked.youLikedThisProfile}
                          </p>
                        )}
                        {(() => {
                          const secondary = matchListSecondaryMeta(m);
                          return secondary ? (
                            <p className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                              {secondary}
                            </p>
                          ) : null;
                        })()}
                        {hardBlocked && (
                          <div className="space-y-1.5 pt-1">
                            <span
                              className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                              aria-label={listCopy.hardBlocked.badgeAria}
                            >
                              {listCopy.hardBlocked.badge}
                            </span>
                            {(() => {
                              const firstReason = hardBlocked.reasons[0];
                              if (!firstReason) return null;
                              const formatted = formatHardBlockReason(
                                firstReason,
                                listCopy.hardBlocked,
                              );
                              return (
                                <div className="space-y-1">
                                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                    {formatted.primary}
                                  </p>
                                  {formatted.evidence && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {formatted.evidence}
                                    </p>
                                  )}
                                  {hardBlocked.reasons.length > 1 && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {listCopy.hardBlocked.moreReasonsCount(
                                        hardBlocked.reasons.length - 1,
                                      )}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {!hardBlocked && m.explainability?.reasonShort && (
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {m.explainability.reasonShort}
                          </p>
                        )}
                        {(() => {
                          if (hardBlocked) return null;
                          const sharedNote = formatSharedInterestNote(
                            m.explainability?.sharedInterestNote,
                          );
                          return sharedNote ? (
                            <p
                              data-testid="match-list-shared-interests"
                              className="truncate text-xs text-emerald-700 dark:text-emerald-400"
                            >
                              {sharedNote}
                            </p>
                          ) : null;
                        })()}
                        {m.analyzedAt && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {listCopy.updatedPrefix}{' '}
                            {new Date(m.analyzedAt).toLocaleDateString(locale, {
                              dateStyle: 'medium',
                            })}
                          </p>
                        )}
                      </div>
                      {!hardBlocked && (
                        <div className="flex shrink-0 items-center gap-2 self-center">
                          {m.yourAction != null &&
                            (() => {
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
                          <span
                            className="text-zinc-400 dark:text-zinc-500"
                            aria-hidden
                          >
                            →
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
            <li
              ref={sentinelRef}
              className="h-4 list-none"
              aria-hidden
              data-testid="matches-infinite-sentinel"
            />
            {loadingMore && (
              <li className="list-none py-2 text-center text-xs text-zinc-400">
                {copy.common.loading}
              </li>
            )}
            {!hasMore ? null : null}
          </ul>
        )}
      </div>
    </div>
  );
}
