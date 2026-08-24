'use client';

import { useMatchActions } from '@/hooks/use-match-actions';
import type { MeMatchItemDto } from '@/lib/api/me-matches-api';
import type { AppCopySchema } from '@/lib/i18n/types';

export type MatchBrowseActionsProps = {
  matchId: string;
  initialAction: MeMatchItemDto['yourAction'];
  detailCopy: AppCopySchema['matches']['detail'];
  disabled: boolean;
  onMutualMatch: (conversationId: string) => void;
  onActionSuccess?: (action: 'LIKE' | 'PASS' | 'BLOCK') => void;
};

function actionStatusMessage(
  action: MeMatchItemDto['yourAction'],
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

/**
 * Like / Pass / undo for photo-first browse cards.
 */
export function MatchBrowseActions({
  matchId,
  initialAction = null,
  detailCopy,
  disabled,
  onMutualMatch,
  onActionSuccess,
}: MatchBrowseActionsProps) {
  const {
    like,
    pass,
    undo,
    actionLoading,
    currentAction,
    canUndo,
    error: actionError,
  } = useMatchActions({
    matchId,
    initialAction: initialAction ?? null,
    onMutualMatch,
    onActionSuccess,
  });

  const statusMessage = actionStatusMessage(currentAction, detailCopy);

  if (disabled) {
    return (
      <p
        className="text-sm text-zinc-500 dark:text-zinc-400"
        role="status"
        data-testid="match-browse-actions-disabled"
      >
        {detailCopy.hardBlocked.actionsDisabled}
      </p>
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-2"
      data-testid="match-browse-actions"
    >
      {statusMessage ? (
        <div className="flex flex-col items-stretch gap-2">
          <p
            className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
            role="status"
          >
            {statusMessage}
          </p>
          {(currentAction === 'LIKE' || currentAction === 'PASS') && (
            <button
              type="button"
              onClick={() => void undo()}
              disabled={!canUndo}
              aria-label={
                currentAction === 'LIKE'
                  ? detailCopy.undoLikeAria
                  : detailCopy.undoPassAria
              }
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {actionLoading ? detailCopy.saving : detailCopy.undo}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="match-browse-like"
            onClick={() => void like()}
            disabled={actionLoading}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
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
            data-testid="match-browse-pass"
            onClick={() => void pass()}
            disabled={actionLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {detailCopy.pass}
          </button>
        </div>
      )}
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
  );
}
