"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessagingShellProvider } from "@/components/messaging-shell-provider";
import { NavAuth } from "@/components/nav-auth";
import { useAuth } from "@/contexts/auth-context";
import { useConversationUnread } from "@/contexts/conversation-unread-context";
import { hasSessionCookie } from "@/lib/session-cookie";
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  getCopy,
  getLocaleDirection,
  readStoredLocale,
  type AppCopySchema,
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

function DatingMainNav({
  copy,
  locale,
  navPending,
  onNavClick,
  pathname,
}: {
  copy: AppCopySchema;
  locale: AppLocale;
  navPending: boolean;
  onNavClick: () => void;
  pathname: string;
}) {
  const { totalUnread } = useConversationUnread();

  const homeActive = pathname === "/dating";
  const matchesActive =
    pathname === "/dating/me-matches" ||
    pathname.startsWith("/dating/me-matches/");
  const conversationsActive =
    pathname === "/dating/conversations" ||
    pathname.startsWith("/dating/conversations/");
  const profileActive = pathname === "/dating/profile";
  const analysisActive =
    pathname === "/dating/analysis" || pathname.startsWith("/dating/analysis/");

  const pendingClass = navPending ? "cursor-wait opacity-60" : "";

  return (
    <nav
      className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/dating"
            prefetch
            onClick={onNavClick}
            className={`${navLinkBase} ${homeActive ? navLinkActive : navLinkInactive} ${pendingClass}`}
            aria-current={homeActive ? "page" : undefined}
          >
            {copy.nav.home}
          </Link>
          <Link
            href="/dating/me-matches"
            prefetch
            onClick={onNavClick}
            className={`${navLinkBase} ${matchesActive ? navLinkActive : navLinkInactive} ${pendingClass}`}
            aria-current={matchesActive ? "page" : undefined}
          >
            {copy.nav.matches}
          </Link>
          <Link
            href="/dating/conversations"
            prefetch
            onClick={onNavClick}
            className={`${navLinkBase} ${conversationsActive ? navLinkActive : navLinkInactive} ${pendingClass}`}
            aria-current={conversationsActive ? "page" : undefined}
          >
            {copy.nav.conversations}
            {totalUnread > 0 ? (
              <span
                data-testid="nav-conversations-unread"
                aria-label={copy.nav.conversationsUnreadLabel(totalUnread)}
                className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500"
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            ) : null}
          </Link>
          <Link
            href="/dating/profile"
            prefetch
            onClick={onNavClick}
            className={`${navLinkBase} ${profileActive ? navLinkActive : navLinkInactive} ${pendingClass}`}
            aria-current={profileActive ? "page" : undefined}
          >
            {copy.nav.profile}
          </Link>
          <Link
            href="/dating/analysis"
            prefetch
            onClick={onNavClick}
            className={`${navLinkBase} ${analysisActive ? navLinkActive : navLinkInactive} ${pendingClass}`}
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
  );
}

/**
 * Authenticated product chrome only (never import under `(public)`).
 * Gates **page** content until `GET /api/v1/auth/me` resolves so protected UI does not flash
 * ahead of session confirmation. Sends stale/invalid sessions to public landing with `next`.
 */
export function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  const { status, user, lastError, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [navPending, setNavPending] = useState(false);
  const copy = getCopy(locale);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(landingUrlWithNext());
  }, [status, router]);

  useEffect(() => {
    setNavPending(false);
  }, [pathname]);

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

  if (status === "error") {
    return (
      <>
        <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mx-auto max-w-5xl text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {copy.appShell.apiUnreachableTitle}
          </p>
        </header>
        <div className="mx-auto max-w-lg px-4 py-10 text-sm text-zinc-600 dark:text-zinc-400">
          {lastError ? (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {lastError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {copy.appShell.retryConnection}
          </button>
        </div>
      </>
    );
  }

  if (status === "unauthenticated") {
    return (
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mx-auto max-w-5xl text-sm text-zinc-500">
          {copy.appShell.redirecting}
        </p>
      </header>
    );
  }

  if (status === "loading") {
    if (hasSessionCookie()) {
      return (
        <>
          <header
            className="border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            aria-live="polite"
          >
            <p className="mx-auto max-w-5xl text-xs text-zinc-500">
              {copy.common.syncingSession}
            </p>
          </header>
          {children}
        </>
      );
    }

    return (
      <>
        <header
          className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
          aria-label="Main"
        >
          <div className="mx-auto max-w-5xl text-sm text-zinc-500">
            {copy.common.checkingSession}
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-zinc-500">
          {copy.common.loading}
        </div>
      </>
    );
  }

  if (!user) {
    return children;
  }

  return (
    <div dir={getLocaleDirection(locale)}>
      <MessagingShellProvider sessionUserId={user.id}>
        <DatingMainNav
          copy={copy}
          locale={locale}
          navPending={navPending}
          onNavClick={() => setNavPending(true)}
          pathname={pathname}
        />
        {children}
      </MessagingShellProvider>
    </div>
  );
}
