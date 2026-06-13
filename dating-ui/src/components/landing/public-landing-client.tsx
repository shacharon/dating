"use client";

import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LanguagePicker } from "@/components/language-picker";
import { useAuth } from "@/contexts/auth-context";
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  getLocaleDirection,
  getLocaleHtmlLang,
  readStoredLocale,
  type AppLocale,
} from "@/lib/i18n";
import {
  emitProductLog,
  getObservabilityRoute,
} from "@/lib/observability/product-logger";
import { UiErrorCodes } from "@/lib/observability/ui-error-codes";
import {
  captureReferralFromSearchParams,
  readStoredReferralRef,
} from "@/lib/referral-attribution";
import { postReferralLandingView } from "@/lib/referral-attribution-api";
import { hasSessionCookie } from "@/lib/session-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

const DEFAULT_AFTER_LOGIN = "/dating";

function safeNextPath(raw: string | null): string {
  const n = raw?.trim();
  if (n?.startsWith("/") && !n.startsWith("//")) return n;
  return DEFAULT_AFTER_LOGIN;
}

/**
 * Public entry: localized copy + Google CTA. Default locale is English (`en`).
 * Session is established only via `POST /api/v1/auth/google` + HttpOnly cookie.
 */
export function PublicLandingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signInWithGoogleIdToken, lastError, clearLastError, refresh } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());

  const copy = getCopy(locale).landing;
  const dir = getLocaleDirection(locale);
  const lang = getLocaleHtmlLang(locale);

  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

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

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(nextPath);
    }
  }, [status, router, nextPath]);

  useEffect(() => {
    captureReferralFromSearchParams(searchParams);
    void postReferralLandingView(readStoredReferralRef() != null);
  }, [searchParams]);

  const onGoogleCredential = useCallback(
    async (idToken: string) => {
      emitProductLog({
        level: "trace",
        route: getObservabilityRoute(),
        message: "public landing: Google credential received",
        errorCode: UiErrorCodes.UI_LOGIN_CREDENTIAL_START,
        meta: { nextPath },
      });
      clearLastError();
      setSigningIn(true);
      try {
        const ok = await signInWithGoogleIdToken(idToken);
        if (ok) router.replace(nextPath);
      } finally {
        setSigningIn(false);
      }
    },
    [signInWithGoogleIdToken, router, nextPath, clearLastError],
  );

  /** Only block landing when a session cookie might auto-redirect (avoid blank wait for new visitors). */
  const showBootstrapLoading =
    status === "loading" && hasSessionCookie() && !signingIn;
  const showCta =
    status === "unauthenticated" || status === "error" || signingIn;

  return (
    <main
      dir={dir}
      lang={lang}
      className="mx-auto flex min-h-[calc(100dvh-0px)] max-w-lg flex-col justify-center px-6 py-16"
    >
      <h1 className="mb-3 text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {copy.title}
      </h1>
      <p className="mb-10 text-center text-lg text-zinc-600 dark:text-zinc-400">
        {copy.subtitle}
      </p>

      {showBootstrapLoading ? (
        <p className="text-center text-sm text-zinc-500">{copy.checkingSession}</p>
      ) : null}

      {showCta ? (
        <div className="space-y-4">
          <LanguagePicker
            locale={locale}
            onLocaleChange={setLocale}
            className="mx-auto max-w-xs"
            id="landing-language-picker"
          />
          {lastError ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
              role="alert"
              dir="ltr"
            >
              {lastError}
            </div>
          ) : null}
          {status === "error" ? (
            <button
              type="button"
              onClick={() => {
                clearLastError();
                void refresh();
              }}
              className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {copy.retryApi}
            </button>
          ) : null}
          <div className="flex min-h-[48px] flex-col items-center gap-3">
            <p className="text-center text-base font-medium text-zinc-800 dark:text-zinc-200">
              {copy.googleSignIn}
            </p>
            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={onGoogleCredential}
              disabled={signingIn}
            />
          </div>
          {signingIn ? (
            <p className="text-center text-sm text-zinc-500">{copy.signingIn}</p>
          ) : null}
        </div>
      ) : null}

      <footer
        dir="ltr"
        lang="en"
        className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          {copy.privacyLink}
        </Link>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          {copy.termsLink}
        </Link>
      </footer>
    </main>
  );
}
