'use client';

import { MatchPhoto } from '@/components/match-photo';
import { useAppLocale } from '@/lib/i18n';

export interface MatchCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  photoUrl: string | null;
  onSendMessage: () => void;
}

export function MatchCelebrationModal({
  open,
  onClose,
  candidateName,
  photoUrl,
  onSendMessage,
}: MatchCelebrationModalProps) {
  const { copy } = useAppLocale();
  const celebrationCopy = copy.matches.celebration;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-celebration-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={celebrationCopy.closeAria}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <h2
            id="match-celebration-title"
            className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400"
          >
            {celebrationCopy.title}
          </h2>

          <div className="mt-5">
            <MatchPhoto
              variant="celebration"
              photoUrl={photoUrl}
              displayName={candidateName}
              testId="match-celebration-photo"
            />
          </div>

          <p className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {candidateName}
          </p>

          <button
            type="button"
            onClick={onSendMessage}
            className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {celebrationCopy.sendMessage}
          </button>
        </div>
      </div>
    </div>
  );
}
