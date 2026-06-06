"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          The error was reported. Try again or refresh the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
