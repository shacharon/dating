'use client';

export type RouteErrorProps = {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

/** Full-viewport recovery UI for Next.js `error.tsx` boundaries. */
export function RouteError({
  title,
  message,
  retryLabel,
  onRetry,
}: RouteErrorProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      role="alert"
    >
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:outline-emerald-400"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
