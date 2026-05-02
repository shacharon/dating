"use client";

import { useAuth } from "@/contexts/auth-context";
import type { AuthUser } from "@/lib/auth/types";
import { DEFAULT_LOCALE, getCopy, type AppLocale } from "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Match `href` (path + optional `?query`) to App Router location (no leading `?` in `search`). */
function hrefMatchesLocation(
  href: string,
  pathname: string,
  search: string,
): boolean {
  const q = href.indexOf("?");
  const path = q >= 0 ? href.slice(0, q) : href;
  const qs = q >= 0 ? href.slice(q + 1) : "";
  return path === pathname && qs === search;
}

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
const menuItemDisabledClass =
  "block w-full cursor-not-allowed px-4 py-2 text-left text-sm text-zinc-400 dark:text-zinc-500";

export function NavAuth({ locale = DEFAULT_LOCALE }: { locale?: AppLocale }) {
  const { status, user, logout, lastError, clearLastError } = useAuth();
  const copy = getCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navPendingHref, setNavPendingHref] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    router.prefetch("/onboarding/basic?edit=1");
    router.prefetch("/onboarding/texts?edit=1");
    router.prefetch("/settings/account");
    router.prefetch("/settings/language");
  }, [menuOpen, router]);

  useEffect(() => {
    if (!navPendingHref) return;
    if (hrefMatchesLocation(navPendingHref, pathname, search)) {
      console.timeEnd("nav");
      setNavPendingHref(null);
    }
  }, [pathname, search, navPendingHref]);

  function onAvatarMenuNavigate(href: string) {
    console.time("nav");
    setNavPendingHref(href);
    setMenuOpen(false);
  }

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
        aria-busy={navPendingHref !== null}
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
            prefetch
            className={menuItemClass}
            role="menuitem"
            onClick={() => onAvatarMenuNavigate("/settings/account")}
          >
            {copy.nav.accountSettings}
          </Link>
          <Link
            href="/onboarding/basic?edit=1"
            prefetch
            className={menuItemClass}
            role="menuitem"
            onClick={() => onAvatarMenuNavigate("/onboarding/basic?edit=1")}
          >
            {copy.nav.editBasicProfile}
          </Link>
          <Link
            href="/onboarding/texts?edit=1"
            prefetch
            className={menuItemClass}
            role="menuitem"
            onClick={() => onAvatarMenuNavigate("/onboarding/texts?edit=1")}
          >
            {copy.nav.editStoryProfile}
          </Link>
          <span className={menuItemDisabledClass} role="menuitem" aria-disabled="true">
            Match Preferences (TODO)
          </span>
          <Link
            href="/settings/language"
            prefetch
            className={menuItemClass}
            role="menuitem"
            onClick={() => onAvatarMenuNavigate("/settings/language")}
          >
            {copy.nav.language}
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
            {copy.nav.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}
