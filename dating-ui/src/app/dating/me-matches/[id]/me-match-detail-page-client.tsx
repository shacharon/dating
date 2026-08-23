'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchMatchAction,
  fetchMatchFeedback,
  fetchMyMatchById,
  type MeMatchDetailDto,
} from '@/lib/me-matches-api';
import { useAppLocale } from '@/lib/i18n';
import { useMatchActions } from '@/hooks/use-match-actions';
import { useMatchFeedback } from '@/hooks/use-match-feedback';
import { useCelebrationFlow } from '@/hooks/use-celebration-flow';
import { MatchDetailHeader } from '@/components/match-detail/match-detail-header';
import { MatchDetailHardBlock } from '@/components/match-detail/match-detail-hard-block';
import { MatchDetailContent } from '@/components/match-detail/match-detail-content';
import { MatchDetailFeedback } from '@/components/match-detail/match-detail-feedback';
import { MatchDetailActions } from '@/components/match-detail/match-detail-actions';
import { MatchDetailModals } from '@/components/match-detail/match-detail-modals';

export default function MeMatchDetailPageClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { locale, copy } = useAppLocale();
  const detailCopy = copy.matches.detail;
  const feedbackCopy = copy.launch.matchDetail.feedback;
  const [data, setData] = useState<MeMatchDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [mutualMatch, setMutualMatch] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const {
    like,
    pass,
    undo,
    actionLoading,
    currentAction,
    setCurrentAction,
    canUndo,
    error: actionError,
  } = useMatchActions({
    matchId: id,
    onMutualMatch: (convId) => {
      setMutualMatch(true);
      setConversationId(convId);
      triggerCelebration(convId);
    },
  });

  const {
    submitFeedback,
    submitting: feedbackSaving,
    sentiment: feedbackSentiment,
    setSentiment: setFeedbackSentiment,
    submitted: feedbackThanksVisible,
    error: feedbackError,
  } = useMatchFeedback({ matchId: id });

  const {
    dismissCelebration,
    celebrationData,
    triggerCelebration,
  } = useCelebrationFlow();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchMyMatchById(id), fetchMatchAction(id), fetchMatchFeedback(id)])
      .then(([dto, actionState, feedbackState]) => {
        if (cancelled) return;
        setData(dto);
        setCurrentAction(actionState.action);
        setMutualMatch(actionState.mutualMatch);
        setConversationId(actionState.conversationId);
        setFeedbackSentiment(feedbackState.sentiment);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : detailCopy.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, setCurrentAction, setFeedbackSentiment, detailCopy.loadFailed]);

  const isHardBlocked = data?.hardBlocked != null;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        <nav>
          <Link
            href="/dating/me-matches"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {detailCopy.backToMatches}
          </Link>
        </nav>

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

        {!loading && !error && data && (
          <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <MatchDetailHeader data={data} detailCopy={detailCopy} />
            {data.hardBlocked && (
              <MatchDetailHardBlock
                hardBlocked={data.hardBlocked}
                currentAction={currentAction}
                detailCopy={detailCopy}
              />
            )}
            <MatchDetailContent
              data={data}
              locale={locale}
              detailCopy={detailCopy}
              feedbackSlot={
                <MatchDetailFeedback
                  feedbackCopy={feedbackCopy}
                  sentiment={feedbackSentiment}
                  submitting={feedbackSaving}
                  submitted={feedbackThanksVisible}
                  error={feedbackError}
                  onSubmit={(s) => void submitFeedback(s)}
                />
              }
            />
            <MatchDetailActions
              matchId={id}
              detailCopy={detailCopy}
              cancelLabel={copy.common.cancel}
              reportLabel={copy.reportUser.linkLabel}
              mutualMatch={mutualMatch}
              conversationId={conversationId}
              currentAction={currentAction}
              canUndo={canUndo}
              actionLoading={actionLoading}
              actionError={actionError}
              isHardBlocked={isHardBlocked}
              like={like}
              pass={pass}
              undo={undo}
              onReport={() => setReportOpen(true)}
              onBlocked={() => router.push('/dating/me-matches')}
            />
          </article>
        )}
      </div>

      {data && id ? (
        <MatchDetailModals
          data={data}
          matchId={id}
          celebrationData={celebrationData}
          reportOpen={reportOpen}
          onDismissCelebration={dismissCelebration}
          onCloseReport={() => setReportOpen(false)}
          onSendMessage={(conversationId) => {
            router.push(`/dating/conversations/${conversationId}`);
          }}
        />
      ) : null}
    </div>
  );
}
