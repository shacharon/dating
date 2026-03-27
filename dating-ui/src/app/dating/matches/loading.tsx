export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </header>

        <ul className="flex flex-col gap-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
