'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MatchListEmptyState } from '@/components/match-list-empty-state';
import { MatchListNotAnalyzedGate } from '@/components/match-list-not-analyzed-gate';
import { MatchListPhotoGate } from '@/components/match-list-photo-gate';
import { MatchListNoProfileGate } from '@/components/match-list-no-profile-gate';
import { useAppLocale } from '@/lib/i18n';
import { useCelebrationFlow } from '@/hooks/use-celebration-flow';
import { useInfiniteMatches } from '@/hooks/use-matches';
import { MatchListItem } from './match-list-item';
import { MatchPrioritySections } from './match-priority-sections';
import {
  applyMatchesScrollY,
  consumeMatchesScrollRestore,
} from './me-matches-scroll';
import { matchListPrimaryLabel } from '@/lib/matches/match-display';

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
    sentinelRef,
  } = useInfiniteMatches(listCopy.loadFailed);
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
          data?.status === 'not_ready' &&
          data.reason === 'no_photo' && <MatchListPhotoGate />}

        {!loading &&
          !error &&
          data?.status === 'not_ready' &&
          data.reason === 'no_profile' && <MatchListNoProfileGate />}

        {!loading &&
          !error &&
          data?.status === 'not_ready' &&
          data.reason === 'not_analyzed' && <MatchListNotAnalyzedGate />}

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
              <p className="py-2 text-center text-xs text-zinc-400">
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
