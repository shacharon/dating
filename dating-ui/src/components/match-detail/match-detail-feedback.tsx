'use client';

import type { AppCopySchema } from '@/lib/i18n/types';

type FeedbackSentiment = 'POSITIVE' | 'NEGATIVE' | null;

type Props = {
  feedbackCopy: AppCopySchema['launch']['matchDetail']['feedback'];
  sentiment: FeedbackSentiment;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
  onSubmit: (sentiment: 'positive' | 'negative') => void;
};

/** Thumbs up/down match-quality feedback widget for match detail. */
export function MatchDetailFeedback({
  feedbackCopy,
  sentiment,
  submitting,
  submitted,
  error,
  onSubmit,
}: Props) {
  return (
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
          aria-pressed={sentiment === 'POSITIVE'}
          disabled={submitting}
          onClick={() => onSubmit('positive')}
          className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            sentiment === 'POSITIVE'
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
          aria-pressed={sentiment === 'NEGATIVE'}
          disabled={submitting}
          onClick={() => onSubmit('negative')}
          className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            sentiment === 'NEGATIVE'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          <span aria-hidden="true">👎</span>
        </button>
      </div>
      {submitted && (
        <p
          data-testid="match-feedback-thanks"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
          role="status"
        >
          {feedbackCopy.thanks}
        </p>
      )}
      {error && (
        <div
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}
    </section>
  );
}
