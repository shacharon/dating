'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  blockMatch,
  fetchMatchAction,
  fetchMyMatchById,
  likeMatch,
  passMatch,
  undoMatchAction,
  type MeMatchDetailDto,
} from '@/lib/me-profile-api';
import { matchDetailSubtitle, matchDetailTitle } from '../match-display';
import { MatchCelebrationModal } from '@/components/match-celebration-modal';
import { MatchPhoto } from '@/components/match-photo';
import { ReportUserDialog } from '@/components/report-user-dialog';
import { getCopy, readStoredLocale } from '@/lib/i18n';

type YourAction = 'LIKE' | 'PASS' | 'BLOCK' | null;

function actionStatusMessage(action: YourAction): string | null {
  switch (action) {
    case 'LIKE':
      return 'You liked this person';
    case 'PASS':
      return 'You passed on this person';
    case 'BLOCK':
      return 'You blocked this person';
    default:
      return null;
  }
}

function undoAriaLabel(action: 'LIKE' | 'PASS'): string {
  return action === 'LIKE'
    ? 'Undo your like on this match'
    : 'Undo your pass on this match';
}

export default function MeMatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchMyMatchById(id), fetchMatchAction(id)])
      .then(([dto, actionState]) => {
        if (cancelled) return;
        setData(dto);
        setYourAction(actionState.action);
        setMutualMatch(actionState.mutualMatch);
        setConversationId(actionState.conversationId);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load match');
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
            ? 'Failed to like match'
            : 'Failed to pass on match',
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
        e instanceof Error ? e.message : 'Failed to undo match action',
      );
    } finally {
      setActionSaving(false);
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
        e instanceof Error ? e.message : 'Failed to block match',
      );
    } finally {
      setActionSaving(false);
    }
  }

  const statusMessage = actionStatusMessage(yourAction);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">

        {/* Nav */}
        <nav>
          <Link
            href="/dating/me-matches"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to matches
          </Link>
        </nav>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading…
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
                Match
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

            <div className="space-y-5 px-6 py-5 text-sm">
              {(() => {
                const oneLineTakeaway =
                  data.recommendation?.primaryTakeaway ??
                  data.explainability?.reasonShort ??
                  null;
                return oneLineTakeaway ? (
                  <p
                    data-testid="match-detail-takeaway"
                    className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200"
                  >
                    {oneLineTakeaway}
                  </p>
                ) : null;
              })()}

              {data.explainability &&
              (data.explainability.positiveChips.length > 0 ||
                data.explainability.tensionChip) ? (
                <section data-testid="match-detail-chips">
                  <div className="flex flex-wrap gap-1.5">
                    {data.explainability.positiveChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      >
                        {chip}
                      </span>
                    ))}
                    {data.explainability.tensionChip ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        {data.explainability.tensionChip}
                      </span>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {data.matchScore != null ? (
                <p
                  data-testid="match-detail-score"
                  className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400"
                >
                  {getCopy(readStoredLocale()).launch.matchDetail.matchScoreLabel(
                    data.matchScore,
                  )}
                </p>
              ) : null}

              {data.matchExplanationTraits && data.matchExplanationTraits.length > 0 && (
                <section className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Why you match
                  </p>
                  <ul className="mt-3 space-y-3">
                    {data.matchExplanationTraits.map((trait) => (
                      <li key={`${trait.group}-${trait.label}`} className="text-sm">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {trait.group}
                          </span>
                          <span
                            className={
                              trait.strength === 'strong'
                                ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                                : 'text-xs font-medium text-zinc-500 dark:text-zinc-400'
                            }
                          >
                            {trait.strength === 'strong' ? 'Strong' : 'Moderate'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {trait.evidence}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.recommendation?.caution ? (
                <section className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {data.recommendation.caution}
                  </p>
                </section>
              ) : null}

              {/* Analysis summary */}
              {data.evaluationSummary ? (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    About them
                  </p>
                  <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {data.evaluationSummary}
                  </p>
                </section>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-500">
                  No analysis summary available yet.
                </p>
              )}

              {data.analyzedAt && (
                <p className="text-xs text-zinc-300 dark:text-zinc-600">
                  Analyzed{' '}
                  {new Date(data.analyzedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>

            <footer className="flex flex-col items-start gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              {mutualMatch && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    You matched!
                  </span>
                  {conversationId && (
                    <Link
                      href={`/dating/conversations/${conversationId}`}
                      className="text-xs font-medium text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400"
                    >
                      View conversation
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
                        disabled={actionSaving}
                        aria-label={undoAriaLabel(yourAction)}
                        className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        {actionSaving ? 'Saving…' : 'Undo'}
                      </button>
                      {actionSaving && (
                        <p
                          className="text-xs text-zinc-400 dark:text-zinc-500"
                          role="status"
                        >
                          Saving…
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
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void recordAction('LIKE')}
                      disabled={actionSaving}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                      {actionSaving ? 'Saving…' : 'Like'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void recordAction('PASS')}
                      disabled={actionSaving}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Pass
                    </button>
                  </div>
                  {actionSaving && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500" role="status">
                      Saving…
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
                      Are you sure? This can&apos;t be undone.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBlockConfirmOpen(false)}
                        disabled={actionSaving}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBlockConfirm()}
                        disabled={actionSaving}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {actionSaving ? 'Saving…' : 'Block permanently'}
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
                    Block
                  </button>
                )}
                <button
                  type="button"
                  data-testid="match-detail-report"
                  onClick={() => setReportOpen(true)}
                  disabled={actionSaving}
                  className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {getCopy(readStoredLocale()).reportUser.linkLabel}
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
                Back to matches
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
