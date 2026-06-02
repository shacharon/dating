'use client';

import { conversationPhotoSrc } from '@/lib/conversations-api';

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
  if (!open) return null;

  const src = conversationPhotoSrc(photoUrl);

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
          aria-label="Close"
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <h2
            id="match-celebration-title"
            className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400"
          >
            It&apos;s a match!
          </h2>

          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              className="mt-5 h-28 w-28 rounded-full object-cover ring-4 ring-emerald-100 dark:ring-emerald-900/50"
            />
          ) : (
            <div
              className="mt-5 flex h-28 w-28 items-center justify-center rounded-full bg-zinc-100 text-3xl font-semibold text-zinc-400 ring-4 ring-emerald-100 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-emerald-900/50"
              aria-hidden
            >
              {candidateName.charAt(0).toUpperCase()}
            </div>
          )}

          <p className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {candidateName}
          </p>

          <button
            type="button"
            onClick={onSendMessage}
            className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            Send a message
          </button>
        </div>
      </div>
    </div>
  );
}
