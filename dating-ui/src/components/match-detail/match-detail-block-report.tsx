'use client';

import { useState } from 'react';
import { blockMatch } from '@/lib/me-matches-api';
import type { AppCopySchema } from '@/lib/i18n/types';

type Props = {
  matchId: string;
  detailCopy: AppCopySchema['matches']['detail'];
  cancelLabel: string;
  reportLabel: string;
  onReport: () => void;
  onBlocked: () => void;
};

/**
 * Report menu and block confirm; calls `blockMatch` then `onBlocked` (list redirect).
 */
export function MatchDetailBlockReport({
  matchId,
  detailCopy,
  cancelLabel,
  reportLabel,
  onReport,
  onBlocked,
}: Props) {
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);

  async function handleBlockConfirm() {
    if (!matchId || blockSaving) return;
    setBlockError(null);
    setBlockSaving(true);
    try {
      await blockMatch(matchId);
      onBlocked();
    } catch (e: unknown) {
      setBlockConfirmOpen(false);
      setBlockError(
        e instanceof Error ? e.message : detailCopy.blockFailed,
      );
    } finally {
      setBlockSaving(false);
    }
  }

  return (
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
              disabled={blockSaving}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleBlockConfirm()}
              disabled={blockSaving}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {blockSaving ? detailCopy.saving : detailCopy.blockPermanently}
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
          disabled={blockSaving}
          className="text-sm font-medium text-red-600 underline-offset-4 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
        >
          {detailCopy.block}
        </button>
      )}
      <button
        type="button"
        data-testid="match-detail-report"
        onClick={onReport}
        disabled={blockSaving}
        className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {reportLabel}
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
  );
}
