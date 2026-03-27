import Link from 'next/link';

export default function PocHomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          POC
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Proof of concept: profile evaluation, viewer, and matching.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          <li>
            <Link
              href="/poc/evaluate"
              className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
            >
              Evaluate
            </Link>
            — Profile evaluator
          </li>
          <li>
            <Link
              href="/poc/profiles"
              className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
            >
              Profile Viewer
            </Link>
            — Saved profiles
          </li>
          <li>
            <Link
              href="/poc/matches"
              className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
            >
              Matches
            </Link>
            — Compare two profiles
          </li>
          <li>
            <Link
              href="/poc/auto-matches"
              className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
            >
              Auto Matches
            </Link>
            — Rebuild and browse matches
          </li>
        </ul>
      </div>
    </div>
  );
}
