'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  blockMatch,
  fetchMatchAction,
  fetchMatchFeedback,
  fetchMyMatchById,
  likeMatch,
  passMatch,
  undoMatchAction,
  upsertMatchFeedback,
  type MeMatchDetailDto,
} from '@/lib/me-profile-api';
import { matchDetailSubtitle, matchDetailTitle } from '../match-display';
import { MatchCelebrationModal } from '@/components/match-celebration-modal';
import { MatchPhoto } from '@/components/match-photo';
import { ReportUserDialog } from '@/components/report-user-dialog';
import { useAppLocale } from '@/lib/i18n';
import { formatHardBlockReason } from '../hard-block-display';
import { formatSharedInterestNote } from '@/lib/enrichment-display-v1';
import {
  resolveDetailProse,
  splitNarrativeParagraphs,
} from './match-detail-prose';

type YourAction = 'LIKE' | 'PASS' | 'BLOCK' | null;
type FeedbackSentiment = 'POSITIVE' | 'NEGATIVE' | null;

export default function MeMatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { locale, copy } = useAppLocale();
  const detailCopy = copy.matches.detail;
  const feedbackCopy = copy.launch.matchDetail.feedback;
  const [data, setData] = useState<MeMatchDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [yourAction, setYourAction] = useState<YourAction>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ conversationId: string } | null>(
    null,
  );
  const [mutualMatch, setMutualMatch] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [feedbackSentiment, setFeedbackSentiment] =
    useState<FeedbackSentiment>(null);
  const [feedbackThanksVisible, setFeedbackThanksVisible] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  function actionStatusMessage(action: YourAction): string | null {
    switch (action) {
      case 'LIKE':
        return detailCopy.actionStatus.liked;
      case 'PASS':
        return detailCopy.actionStatus.passed;
      case 'BLOCK':
        return detailCopy.actionStatus.blocked;
      default:
        return null;
    }
  }

  function undoAriaLabel(action: 'LIKE' | 'PASS'): string {
    return action === 'LIKE'
      ? detailCopy.undoLikeAria
      : detailCopy.undoPassAria;
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchMyMatchById(id), fetchMatchAction(id), fetchMatchFeedback(id)])
      .then(([dto, actionState, feedbackState]) => {
        if (cancelled) return;
        setData(dto);
        setYourAction(actionState.action);
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
  }, [id]);

  async function recordAction(action: 'LIKE' | 'PASS') {
    if (!id || actionSaving || yourAction != null) return;
    setActionError(null);
    setActionSaving(true);
    try {
      if (action === 'LIKE') {
        const result = await likeMatch(id);
        setYourAction('LIKE');
        if (result.mutualMatch && result.conversationId) {
          setCelebration({ conversationId: result.conversationId });
          setMutualMatch(true);
          setConversationId(result.conversationId);
        }
      } else {
        await passMatch(id);
        const actionState = await fetchMatchAction(id);
        setYourAction(actionState.action);
        setMutualMatch(actionState.mutualMatch);
        setConversationId(actionState.conversationId);
      }
    } catch (e: unknown) {
      setActionError(
        e instanceof Error
          ? e.message
          : action === 'LIKE'
            ? detailCopy.likeFailed
            : detailCopy.passFailed,
      );
    } finally {
      setActionSaving(false);
    }
  }

  async function handleUndo() {
    if (
      !id ||
      actionSaving ||
      yourAction == null ||
      yourAction === 'BLOCK'
    ) {
      return;
    }
    setActionError(null);
    setActionSaving(true);
    try {
      await undoMatchAction(id);
      const actionState = await fetchMatchAction(id);
      setYourAction(actionState.action);
      setMutualMatch(actionState.mutualMatch);
      setConversationId(actionState.conversationId);
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : detailCopy.undoFailed,
      );
    } finally {
      setActionSaving(false);
    }
  }

  async function handleFeedback(sentiment: 'positive' | 'negative') {
    if (!id || feedbackSaving) return;
    setFeedbackError(null);
    setFeedbackSaving(true);
    try {
      const result = await upsertMatchFeedback(id, sentiment);
      setFeedbackSentiment(result.sentiment);
      setFeedbackThanksVisible(true);
    } catch (e: unknown) {
      setFeedbackError(
        e instanceof Error ? e.message : detailCopy.feedbackFailed,
      );
    } finally {
      setFeedbackSaving(false);
    }
  }

  async function handleBlockConfirm() {
    if (!id || actionSaving) return;
    setBlockError(null);
    setActionSaving(true);
    try {
      await blockMatch(id);
      router.push('/dating/me-matches');
    } catch (e: unknown) {
      setBlockConfirmOpen(false);
      setBlockError(
        e instanceof Error ? e.message : detailCopy.blockFailed,
      );
    } finally {
      setActionSaving(false);
    }
  }

  const statusMessage = actionStatusMessage(yourAction);
  const isHardBlocked = data?.hardBlocked != null;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">

        {/* Nav */}
        <nav>
          <Link
            href="/dating/me-matches"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {detailCopy.backToMatches}
          </Link>
        </nav>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {copy.common.loading}
          </p>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Match detail */}
        {!loading && !error && data && (
          <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <MatchPhoto
              variant="hero"
              photoUrl={data.primaryPhotoUrl ?? null}
              displayName={matchDetailTitle(data)}
              testId="match-detail-photo"
            />
            <header className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {detailCopy.matchLabel}
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {matchDetailTitle(data)}
              </h1>
              {matchDetailSubtitle(data) && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {matchDetailSubtitle(data)}
                </p>
              )}
            </header>

            {data.hardBlocked && (
              <div
                className="border-b border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-900/50 dark:bg-amber-950/30"
                role="region"
                aria-label={detailCopy.hardBlocked.banner}
                data-testid="match-detail-hard-blocked"
              >
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {detailCopy.hardBlocked.banner}
                </p>
                {yourAction === 'LIKE' && (
                  <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
                    {detailCopy.hardBlocked.youLikedThisProfile}
                  </p>
                )}
                <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-200">
                  {detailCopy.hardBlocked.reasonsHeading}
                </p>
                <ul className="mt-1 space-y-2">
                  {data.hardBlocked.reasons.map((r) => {
                    const formatted = formatHardBlockReason(
                      r,
                      detailCopy.hardBlocked,
                    );
                    return (
                      <li
                        key={`${r.direction}:${r.dimension}:${r.code}`}
                        className="text-sm text-amber-950 dark:text-amber-50"
                      >
                        <p>{formatted.primary}</p>
                        {formatted.evidence && (
                          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/80">
                            {formatted.evidence}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href="/settings/preferences"
                  className="mt-3 inline-block text-sm font-medium text-amber-900 underline-offset-4 hover:underline dark:text-amber-100"
                >
                  {detailCopy.hardBlocked.reviewPreferences}
                </Link>
              </div>
            )}

            <div className="space-y-5 px-6 py-5 text-sm">
              {(() => {
                const prose = resolveDetailProse(data);
                if (prose?.kind === 'narrative') {
                  return (
                    <div
                      data-testid="match-detail-narrative"
                      className="space-y-3 text-base leading-7 text-zinc-800 dark:text-zinc-200"
                    >
                      {splitNarrativeParagraphs(prose.text).map(
                        (paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ),
                      )}
                    </div>
                  );
                }
                if (prose?.kind === 'short') {
                  return (
                    <p
                      data-testid="match-detail-takeaway"
                      className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200"
                    >
                      {prose.text}
                    </p>
                  );
                }
                return null;
              })()}

              {(() => {
                const sharedNote = formatSharedInterestNote(
                  data.explainability?.sharedInterestNote,
                );
                return sharedNote ? (
                  <p
                    data-testid="match-detail-shared-interests"
                    className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                  >
                    {sharedNote}
                  </p>
                ) : null;
              })()}

              <section
                data-testid="match-feedback"
                className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/40"
              >
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {feedbackCopy.prompt}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="match-feedback-positive"
                    aria-label={feedbackCopy.positiveLabel}
                    aria-pressed={feedbackSentiment === 'POSITIVE'}
                    disabled={feedbackSaving}
                    onClick={() => void handleFeedback('positive')}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      feedbackSentiment === 'POSITIVE'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span aria-hidden="true">👍</span>
                  </button>
                  <button
                    type="button"
                    data-testid="match-feedback-negative"
                    aria-label={feedbackCopy.negativeLabel}
                    aria-pressed={feedbackSentiment === 'NEGATIVE'}
                    disabled={feedbackSaving}
                    onClick={() => void handleFeedback('negative')}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      feedbackSentiment === 'NEGATIVE'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span aria-hidden="true">👎</span>
                  </button>
                </div>
                {feedbackThanksVisible && (
                  <p
                    data-testid="match-feedback-thanks"
                    className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
                    role="status"
                  >
                    {feedbackCopy.thanks}
                  </p>
                )}
                {feedbackError && (
                  <div
                    className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    role="alert"
                  >
                    {feedbackError}
                  </div>
                )}
              </section>

              {data.recommendation?.caution ? (
                <section className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {data.recommendation.caution}
                  </p>
                </section>
              ) : null}

              {data.analyzedAt && (
                <p className="text-xs text-zinc-300 dark:text-zinc-600">
                  {detailCopy.analyzedPrefix}{' '}
                  {new Date(data.analyzedAt).toLocaleString(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>

            <footer className="flex flex-col items-start gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              {mutualMatch && (
                <div className="flex flex-col items-start gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {detailCopy.youMatched}
                  </span>
                  {conversationId && (
                    <Link
                      href={`/dating/conversations/${conversationId}`}
                      data-testid="match-detail-view-conversation"
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                      {detailCopy.viewConversation}
                    </Link>
                  )}
                </div>
              )}
              {statusMessage ? (
                <div className="flex flex-col items-start gap-2">
                  <p
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
                    role="status"
                  >
                    {statusMessage}
                  </p>
                  {(yourAction === 'LIKE' || yourAction === 'PASS') && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleUndo()}
                        disabled={actionSaving || isHardBlocked}
                        aria-label={undoAriaLabel(yourAction)}
                        className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        {actionSaving ? detailCopy.saving : detailCopy.undo}
                      </button>
                      {actionSaving && (
                        <p
                          className="text-xs text-zinc-400 dark:text-zinc-500"
                          role="status"
                        >
                          {detailCopy.saving}
                        </p>
                      )}
                      {actionError && (
                        <div
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                          role="alert"
                        >
                          {actionError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : isHardBlocked ? (
                <p
                  className="text-sm text-zinc-500 dark:text-zinc-400"
                  role="status"
                >
                  {detailCopy.hardBlocked.actionsDisabled}
                </p>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void recordAction('LIKE')}
                      disabled={actionSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                      {actionSaving ? (
                        detailCopy.saving
                      ) : (
                        <>
                          <span aria-hidden="true">❤️</span>
                          {detailCopy.like}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void recordAction('PASS')}
                      disabled={actionSaving}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {detailCopy.pass}
                    </button>
                  </div>
                  {actionSaving && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500" role="status">
                      {detailCopy.saving}
                    </p>
                  )}
                  {actionError && (
                    <div
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                      role="alert"
                    >
                      {actionError}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col items-start gap-2">
                {blockConfirmOpen ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {detailCopy.blockConfirm}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBlockConfirmOpen(false)}
                        disabled={actionSaving}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {copy.common.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBlockConfirm()}
                        disabled={actionSaving}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {actionSaving ? detailCopy.saving : detailCopy.blockPermanently}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setBlockError(null);
                      setBlockConfirmOpen(true);
                    }}
                    disabled={actionSaving}
                    className="text-sm font-medium text-red-600 underline-offset-4 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {detailCopy.block}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="match-detail-report"
                  onClick={() => setReportOpen(true)}
                  disabled={actionSaving}
                  className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {copy.reportUser.linkLabel}
                </button>
                {blockError && (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    role="alert"
                  >
                    {blockError}
                  </div>
                )}
              </div>
              <Link
                href="/dating/me-matches"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {detailCopy.backToMatchesButton}
              </Link>
            </footer>
          </article>
        )}
      </div>

      {data && celebration && (
        <MatchCelebrationModal
          open
          onClose={() => setCelebration(null)}
          candidateName={matchDetailTitle(data)}
          photoUrl={data.primaryPhotoUrl ?? null}
          onSendMessage={() => {
            router.push(`/dating/conversations/${celebration.conversationId}`);
          }}
        />
      )}
      {data && id ? (
        <ReportUserDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          contextType="MATCH_PROFILE"
          contextId={id}
          subjectLabel={matchDetailTitle(data)}
        />
      ) : null}
    </div>
  );
}
