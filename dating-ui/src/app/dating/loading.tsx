export default function DatingLoading() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 hidden lg:block">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </main>
    </div>
  );
}
