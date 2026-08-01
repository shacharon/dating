'use client';

import Link from 'next/link';
import type { AppCopySchema } from '@/lib/i18n/types';
import { MatchDetailBlockReport } from '@/components/match-detail/match-detail-block-report';

type YourAction = 'LIKE' | 'PASS' | 'BLOCK' | null;

type Props = {
  matchId: string;
  detailCopy: AppCopySchema['matches']['detail'];
  cancelLabel: string;
  reportLabel: string;
  mutualMatch: boolean;
  conversationId: string | null;
  currentAction: YourAction;
  canUndo: boolean;
  actionLoading: boolean;
  actionError: string | null;
  isHardBlocked: boolean;
  like: () => Promise<void>;
  pass: () => Promise<void>;
  undo: () => Promise<void>;
  onReport: () => void;
  onBlocked: () => void;
};

function actionStatusMessage(
  action: YourAction,
  detailCopy: AppCopySchema['matches']['detail'],
): string | null {
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

function undoAriaLabel(
  action: 'LIKE' | 'PASS',
  detailCopy: AppCopySchema['matches']['detail'],
): string {
  return action === 'LIKE'
    ? detailCopy.undoLikeAria
    : detailCopy.undoPassAria;
}

/**
 * Like / pass / undo / open conversation plus block-report overflow.
 * Used by the match detail page orchestrator.
 */
export function MatchDetailActions({
  matchId,
  detailCopy,
  cancelLabel,
  reportLabel,
  mutualMatch,
  conversationId,
  currentAction,
  canUndo,
  actionLoading,
  actionError,
  isHardBlocked,
  like,
  pass,
  undo,
  onReport,
  onBlocked,
}: Props) {
  const statusMessage = actionStatusMessage(currentAction, detailCopy);

  return (
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
          {(currentAction === 'LIKE' || currentAction === 'PASS') && (
            <>
              <button
                type="button"
                onClick={() => void undo()}
                disabled={!canUndo || isHardBlocked}
                aria-label={undoAriaLabel(currentAction, detailCopy)}
                className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {actionLoading ? detailCopy.saving : detailCopy.undo}
              </button>
              {actionLoading && (
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          {detailCopy.hardBlocked.actionsDisabled}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void like()}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              {actionLoading ? (
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
              onClick={() => void pass()}
              disabled={actionLoading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {detailCopy.pass}
            </button>
          </div>
          {actionLoading && (
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
      <MatchDetailBlockReport
        matchId={matchId}
        detailCopy={detailCopy}
        cancelLabel={cancelLabel}
        reportLabel={reportLabel}
        onReport={onReport}
        onBlocked={onBlocked}
      />
      <Link
        href="/dating/me-matches"
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {detailCopy.backToMatchesButton}
      </Link>
    </footer>
  );
}
