import Link from 'next/link';

export default function DatingLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl pt-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Find your match
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Share a bit about yourself and who you’re looking for—we’ll help you get there.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/onboarding"
            className="inline-block rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Get started
          </Link>
          <Link
            href="/dating/matches"
            className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View matches
          </Link>
        </div>
      </div>
    </div>
  );
}
