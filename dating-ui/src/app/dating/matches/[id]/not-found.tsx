import Link from 'next/link';

export default function MatchNotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Match not found
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            This link may be outdated or the match is no longer available. Head back to your list
            to pick someone else.
          </p>
          <Link
            href="/dating/matches"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Back to matches
          </Link>
        </div>
      </div>
    </div>
  );
}
