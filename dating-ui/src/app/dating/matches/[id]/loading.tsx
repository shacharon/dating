export default function MatchDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <article className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8">
          <div className="h-9 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-6 h-20 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-4 h-12 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-6 flex flex-wrap gap-2">
            <div className="h-7 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-7 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-[92%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="mt-10 h-12 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </article>
      </div>
    </div>
  );
}
