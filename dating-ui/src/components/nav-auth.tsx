"use client";

import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export function NavAuth() {
  const { status, user, logout } = useAuth();

  if (status === "loading") {
    return (
      <span className="text-xs text-zinc-400 dark:text-zinc-500" aria-hidden>
        …
      </span>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className="max-w-[12rem] truncate text-zinc-600 dark:text-zinc-400"
        title={user?.email}
      >
        {user?.email}
      </span>
      <button
        type="button"
        className="font-medium text-zinc-700 underline decoration-zinc-400 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        onClick={() => void logout()}
      >
        Log out
      </button>
    </div>
  );
}
