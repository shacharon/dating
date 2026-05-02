"use client";

import { useAuth } from "@/contexts/auth-context";
import type { AuthUser } from "@/lib/auth/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function initialsForUser(user: AuthUser): string {
  const n = user.displayName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
      ).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

const menuItemClass =
  "block w-full px-4 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function NavAuth() {
  const { status, user, logout, lastError, clearLastError } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocPointer = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  if (!user) {
    return null;
  }

  const initials = initialsForUser(user);

  return (
    <div className="relative flex justify-end" ref={rootRef}>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-500"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        onClick={() => setMenuOpen((o) => !o)}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote user avatar URLs (e.g. Google)
          <img
            src={user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {initials}
          </span>
        )}
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[13rem] rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          role="menu"
          aria-label="Account"
        >
          <Link
            href="/settings/account"
            className={menuItemClass}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Account Settings
          </Link>
          <Link
            href="/settings/profile"
            className={menuItemClass}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Profile Details
          </Link>
          <Link
            href="/settings/preferences"
            className={menuItemClass}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Match Preferences
          </Link>
          <Link
            href="/settings/language"
            className={menuItemClass}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Language
          </Link>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
          <button
            type="button"
            className={menuItemClass}
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void logout();
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
