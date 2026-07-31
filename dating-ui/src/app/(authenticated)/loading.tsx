export default function AuthenticatedLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}
