'use client';

import Link from 'next/link';

export default function MatchDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dating/matches"
          className="inline-block text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to matches
        </Link>

        <div className="mt-6 rounded-xl border border-red-200 bg-white p-8 dark:border-red-900/35 dark:bg-zinc-900">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Could not load this match
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {error.message ||
              'Check that the API is running and you are online, then try again.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Try again
            </button>
            <Link
              href="/dating/matches"
              className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
            >
              All matches
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
