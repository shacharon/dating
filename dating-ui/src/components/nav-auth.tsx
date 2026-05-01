"use client";

import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export function NavAuth() {
  const { status, user, logout, lastError, clearLastError } = useAuth();

  if (status === "loading") {
    return (
      <span className="text-xs text-zinc-400 dark:text-zinc-500" aria-hidden>
        …
      </span>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {lastError ? (
          <span
            className="max-w-[14rem] truncate text-xs text-red-600 dark:text-red-400"
            title={lastError}
          >
            Cannot reach API
          </span>
        ) : null}
        {lastError ? (
          <button
            type="button"
            className="text-xs text-zinc-500 underline dark:text-zinc-400"
            onClick={() => clearLastError()}
          >
            Dismiss
          </button>
        ) : null}
        <Link
          href="/"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <span
        className="max-w-[14rem] truncate text-zinc-600 dark:text-zinc-400"
        title={user?.email}
      >
        {user?.email}
      </span>
      <button
        type="button"
        className="shrink-0 rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        onClick={() => void logout()}
      >
        Logout
      </button>
    </div>
  );
}
