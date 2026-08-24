"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { InlineError } from "@/components/errors";
import { OfflineBanner } from "@/components/offline-banner";
import { MessagingShellProvider } from "@/components/messaging-shell-provider";
import { PushNotificationsRegistration } from "@/components/push-notifications-registration";
import { useAuth } from "@/contexts/auth-context";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { isNavHrefCurrent } from "@/components/nav/nav-active";
import {
  getLocaleDirection,
  useAppLocale,
  type AppCopySchema,
  type AppLocale,
} from "@/lib/i18n";

/** Clears fixed bottom tab bar + home-indicator inset on mobile. */
const MOBILE_NAV_CONTENT_PAD =
  "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0";

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
  const { status, user, lastError, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { locale, copy } = useAppLocale();
  const [navPending, setNavPending] = useState(false);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(landingUrlWithNext());
  }, [status, router]);

  useEffect(() => {
    setNavPending(false);
  }, [pathname]);

  // Failsafe: never leave nav in wait state if soft-nav doesn't change path
  useEffect(() => {
    if (!navPending) return;
    const t = window.setTimeout(() => setNavPending(false), 2500);
    return () => window.clearTimeout(t);
  }, [navPending]);

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
            <InlineError className="mb-4">{lastError}</InlineError>
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
          aria-label={copy.nav.mainAria}
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
      <PushNotificationsRegistration />
      <MessagingShellProvider sessionUserId={user.id}>
        <Suspense
          fallback={<div className={MOBILE_NAV_CONTENT_PAD}>{children}</div>}
        >
          <AuthenticatedProductChrome
            pathname={pathname}
            locale={locale}
            copy={copy}
            navPending={navPending}
            setNavPending={setNavPending}
          >
            {children}
          </AuthenticatedProductChrome>
        </Suspense>
      </MessagingShellProvider>
    </div>
  );
}

function AuthenticatedProductChrome({
  children,
  pathname,
  locale,
  copy,
  navPending,
  setNavPending,
}: {
  children: ReactNode;
  pathname: string;
  locale: AppLocale;
  copy: AppCopySchema;
  navPending: boolean;
  setNavPending: (v: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const editOnboarding = searchParams.get('edit') === '1';
  /** First-time onboarding only — edit profile keeps AppNav. */
  const hideAppNav =
    pathname.startsWith('/onboarding') && !editOnboarding;

  return (
    <>
      <OfflineBanner />
      {hideAppNav ? null : (
        <AppNav
          pathname={pathname}
          locale={locale}
          copy={copy}
          navPending={navPending}
          onNavClick={(href) => {
            if (isNavHrefCurrent(pathname, href)) {
              setNavPending(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
            setNavPending(true);
          }}
        />
      )}
      <div className={hideAppNav ? undefined : MOBILE_NAV_CONTENT_PAD}>
        {children}
      </div>
    </>
  );
}
