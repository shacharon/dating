'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { submitMyProfileForAnalysis } from '@/lib/me-profile-api';
import { MatchListEmptyState } from '@/components/match-list-empty-state';
import { MatchListPhotoGate } from '@/components/match-list-photo-gate';
import { useAppLocale } from '@/lib/i18n';
import { useCelebrationFlow } from '@/hooks/use-celebration-flow';
import { useInfiniteMatches } from './use-infinite-matches';
import { MatchListItem } from './match-list-item';
import { MatchPrioritySections } from './match-priority-sections';
import {
  applyMatchesScrollY,
  consumeMatchesScrollRestore,
} from './me-matches-scroll';
import { matchListPrimaryLabel } from './match-display';

const MatchCelebrationModal = dynamic(
  () =>
    import('@/components/match-celebration-modal').then((m) => ({
      default: m.MatchCelebrationModal,
    })),
  { ssr: false },
);

type CelebrationContext = {
  conversationId: string;
  candidateName: string;
  photoUrl: string | null;
};

export default function MeMatchesPageClient() {
  const router = useRouter();
  const { locale, copy } = useAppLocale();
  const listCopy = copy.matches.list;
  const detailCopy = copy.matches.detail;
  const {
    data,
    matches,
    loading,
    loadingMore,
    error,
    reload,
    sentinelRef,
  } = useInfiniteMatches(listCopy.loadFailed);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null);
  const [celebrationContext, setCelebrationContext] =
    useState<CelebrationContext | null>(null);
  const scrollRestoreDone = useRef(false);
  const {
    dismissCelebration,
    celebrationData,
    triggerCelebration,
  } = useCelebrationFlow();

  useEffect(() => {
    if (scrollRestoreDone.current) return;
    if (loading) return;

    const y = consumeMatchesScrollRestore();
    scrollRestoreDone.current = true;
    if (y == null) return;

    requestAnimationFrame(() => {
      applyMatchesScrollY(y);
    });
  }, [loading, matches.length]);

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

  const handleMutualMatch = (
    matchId: string,
    conversationId: string,
  ) => {
    const match = matches.find((m) => m.id === matchId);
    setCelebrationContext({
      conversationId,
      candidateName: match
        ? matchListPrimaryLabel(match)
        : detailCopy.matchLabel,
      photoUrl: match?.primaryPhotoUrl ?? null,
    });
    triggerCelebration(conversationId);
  };

  const handleDismissCelebration = () => {
    dismissCelebration();
    setCelebrationContext(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/profile?tab=analysis"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {listCopy.backToAnalysis}
          </Link>
          <Link
            href="/profile?tab=edit#basic"
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
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
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

        {!loading &&
          !error &&
          data?.status === 'not_ready' &&
          data.reason === 'no_photo' && <MatchListPhotoGate />}

        {!loading &&
          !error &&
          data?.status === 'ready' &&
          matches.length === 0 && <MatchListEmptyState />}

        {!loading && !error && data?.status === 'ready' && matches.length > 0 && (
          <div className="space-y-6">
            <MatchPrioritySections
              matches={matches}
              locale={locale}
              listCopy={listCopy}
              detailCopy={detailCopy}
              onMutualMatch={handleMutualMatch}
              renderBlocked={(blocked) =>
                blocked.map((m, index) => (
                  <MatchListItem
                    key={m.id}
                    match={m}
                    index={index}
                    locale={locale}
                    listCopy={listCopy}
                  />
                ))
              }
            />
            <div
              ref={sentinelRef}
              className="h-4"
              aria-hidden
              data-testid="matches-infinite-sentinel"
            />
            {loadingMore && (
              <p
                className="py-2 text-center text-xs text-zinc-400"
                role="status"
              >
                {copy.common.loading}
              </p>
            )}
          </div>
        )}
      </div>

      {celebrationData && celebrationContext ? (
        <MatchCelebrationModal
          open
          onClose={handleDismissCelebration}
          candidateName={celebrationContext.candidateName}
          photoUrl={celebrationContext.photoUrl}
          onSendMessage={() => {
            router.push(
              `/dating/conversations/${celebrationContext.conversationId}`,
            );
          }}
        />
      ) : null}
    </div>
  );
}
