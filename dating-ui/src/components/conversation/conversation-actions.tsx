'use client';

import { useState } from 'react';
import type { AppCopySchema } from '@/lib/i18n/types';

type Props = {
  otherName: string;
  detailCopy: AppCopySchema['conversations']['detail'];
  cancelLabel: string;
  reportLabel: string;
  unmatching: boolean;
  unmatchError: string | null;
  clearUnmatchError: () => void;
  unmatch: () => Promise<void>;
  onReport: () => void;
};

export function ConversationActions({
  otherName,
  detailCopy,
  cancelLabel,
  reportLabel,
  unmatching,
  unmatchError,
  clearUnmatchError,
  unmatch,
  onReport,
}: Props) {
  const [unmatchConfirmOpen, setUnmatchConfirmOpen] = useState(false);

  async function handleUnmatchConfirm() {
    try {
      await unmatch();
    } catch {
      setUnmatchConfirmOpen(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <details className="relative" data-testid="conversation-report-menu">
        <summary className="cursor-pointer list-none text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
          ⋯
        </summary>
        <div className="absolute left-0 top-full z-10 mt-1 min-w-[10rem] rounded border border-zinc-200 bg-white py-1 shadow dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            data-testid="conversation-report-open"
            onClick={onReport}
            className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {reportLabel}
          </button>
        </div>
      </details>
      {unmatchConfirmOpen ? (
        <div
          className="w-full rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20"
          data-testid="conversation-unmatch-confirm"
        >
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {detailCopy.unmatchConfirm(otherName)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUnmatchConfirmOpen(false)}
              disabled={unmatching}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleUnmatchConfirm()}
              disabled={unmatching}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {unmatching ? detailCopy.sending : detailCopy.unmatch}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            clearUnmatchError();
            setUnmatchConfirmOpen(true);
          }}
          disabled={unmatching}
          className="text-sm font-medium text-red-600 underline-offset-4 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
        >
          {detailCopy.unmatch}
        </button>
      )}
      {unmatchError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
          role="alert"
        >
          {unmatchError}
        </div>
      )}
    </div>
  );
}
