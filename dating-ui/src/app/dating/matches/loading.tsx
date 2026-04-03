export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <div className="h-8 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-4 max-w-md animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </header>

        <ul className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <li
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-44 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-3/4 max-w-sm animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="h-14 w-16 shrink-0 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="mt-3 flex gap-1.5">
                <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
