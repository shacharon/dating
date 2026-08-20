'use client';

import type { ReactNode } from 'react';

const DEFAULT_CLASS =
  'rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400';

export type InlineErrorProps = {
  children: ReactNode;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Presentational product error alert — callers pass localized (or English) strings. */
export function InlineError({
  children,
  className,
  onRetry,
  retryLabel,
}: InlineErrorProps) {
  return (
    <div
      className={className ? `${DEFAULT_CLASS} ${className}` : DEFAULT_CLASS}
      role="alert"
    >
      {children}
      {onRetry ? (
        <button
          type="button"
          className="mt-3 block min-h-11 text-sm font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          onClick={onRetry}
        >
          {retryLabel ?? 'Try again'}
        </button>
      ) : null}
    </div>
  );
}
