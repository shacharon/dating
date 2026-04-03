export default function MatchDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <article className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:mt-8">
          <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-8">
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-8 max-w-md animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-5 flex gap-8">
              <div>
                <div className="h-3 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-9 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div>
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-8 w-14 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
          <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-[94%] animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-24 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="flex gap-3 border-t border-zinc-100 px-6 py-6 dark:border-zinc-800 sm:px-8">
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </article>
      </div>
    </div>
  );
}
