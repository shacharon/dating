"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavAuth } from "@/components/nav-auth";
import { useAuth } from "@/contexts/auth-context";
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from "@/lib/i18n";

const navLinkBase =
  "text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500";
const navLinkInactive =
  "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100";
const navLinkActive =
  "font-semibold text-zinc-900 underline decoration-2 underline-offset-4 dark:text-zinc-100";

function landingUrlWithNext(): string {
  if (typeof window === "undefined") return "/";
  const next = `${window.location.pathname}${window.location.search}`;
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  const u = new URL("/", window.location.origin);
  u.searchParams.set("next", next);
  return `${u.pathname}${u.search}`;
}

/**
 * Authenticated product chrome only (never import under `(public)`).
 * Gates **page** content until `GET /api/v1/auth/me` resolves so protected UI does not flash
 * ahead of session confirmation. Sends stale/invalid sessions to public landing with `next`.
 */
export function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const copy = getCopy(locale);

  const homeActive = pathname === "/dating";
  const matchesActive =
    pathname === "/dating/me-matches" ||
    pathname.startsWith("/dating/me-matches/");
  const profileActive = pathname === "/dating/profile";
  const analysisActive =
    pathname === "/dating/analysis" || pathname.startsWith("/dating/analysis/");

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(landingUrlWithNext());
  }, [status, router]);

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      if (e.detail) {
        setLocale(e.detail);
        return;
      }
      setLocale(readStoredLocale());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        setLocale(readStoredLocale());
      }
    };
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (status === "unauthenticated") {
    return (
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mx-auto max-w-5xl text-sm text-zinc-500">Redirecting…</p>
      </header>
    );
  }

  if (status === "loading") {
    return (
      <>
        <header
          className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
          aria-label="Main"
        >
          <div className="mx-auto max-w-5xl text-sm text-zinc-500">
            Checking session…
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-zinc-500">
          Loading…
        </div>
      </>
    );
  }

  return (
    <>
      <nav
        className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/dating"
              className={`${navLinkBase} ${homeActive ? navLinkActive : navLinkInactive}`}
              aria-current={homeActive ? "page" : undefined}
            >
              {copy.nav.home}
            </Link>
            <Link
              href="/dating/me-matches"
              className={`${navLinkBase} ${matchesActive ? navLinkActive : navLinkInactive}`}
              aria-current={matchesActive ? "page" : undefined}
            >
              {copy.nav.matches}
            </Link>
            <Link
              href="/dating/profile"
              className={`${navLinkBase} ${profileActive ? navLinkActive : navLinkInactive}`}
              aria-current={profileActive ? "page" : undefined}
            >
              {copy.nav.profile}
            </Link>
            <Link
              href="/dating/analysis"
              className={`${navLinkBase} ${analysisActive ? navLinkActive : navLinkInactive}`}
              aria-current={analysisActive ? "page" : undefined}
            >
              {copy.nav.analysis}
            </Link>
          </div>
          <div className="flex shrink-0 items-center border-t border-zinc-100 pt-2 sm:border-t-0 sm:pt-0 dark:border-zinc-800">
            <NavAuth locale={locale} />
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
