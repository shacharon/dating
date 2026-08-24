"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LanguagePicker } from "@/components/language-picker";
import { useAuth } from "@/contexts/auth-context";
import {
  getLocaleDirection,
  getLocaleHtmlLang,
  useAppLocale,
} from "@/lib/i18n";
import {
  emitProductLog,
  getObservabilityRoute,
} from "@/lib/observability/product-logger";
import { UiErrorCodes } from "@/lib/observability/ui-error-codes";
import {
  captureReferralFromSearchParams,
  readStoredReferralRef,
} from "@/lib/referral/referral-attribution";
import { postReferralLandingView } from "@/lib/api/referral-attribution-api";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LandingBenefits } from "./landing-benefits";
import { LandingClosingCta } from "./landing-closing-cta";
import { LandingFooter } from "./landing-footer";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingTrustStrip } from "./landing-trust-strip";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

const DEFAULT_AFTER_LOGIN = "/dating/me-matches";

function safeNextPath(raw: string | null): string {
  const n = raw?.trim();
  if (n?.startsWith("/") && !n.startsWith("//")) return n;
  return DEFAULT_AFTER_LOGIN;
}

/**
 * Public entry: value-prop landing + Google CTA.
 * Session via `POST /api/v1/auth/google` + HttpOnly cookie.
 */
export function PublicLandingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signInWithGoogleIdToken, lastError, clearLastError, refresh } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const { locale, copy: appCopy } = useAppLocale();

  const copy = appCopy.landing;
  const dir = getLocaleDirection(locale);
  const lang = getLocaleHtmlLang(locale);

  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

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

  const showBootstrapLoading =
    status === "loading" && hasSessionCookie() && !signingIn;
  const showCta =
    status === "unauthenticated" || status === "error" || signingIn;

  const languageSlot = showCta ? (
    <LanguagePicker
      locale={locale}
      className="max-w-[11rem] rounded-md border border-zinc-200/80 bg-white/80 px-2 py-1 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-950/80"
      id="landing-language-picker"
    />
  ) : null;

  const ctaSlot = showBootstrapLoading ? (
    <p className="text-sm text-zinc-500">{copy.checkingSession}</p>
  ) : showCta ? (
    <div className="space-y-4">
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
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {copy.retryApi}
        </button>
      ) : null}
      <div className="flex min-h-[48px] flex-col items-start gap-3">
        <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
          {copy.googleSignIn}
        </p>
        <GoogleSignInButton
          clientId={googleClientId}
          onCredential={onGoogleCredential}
          disabled={signingIn}
        />
      </div>
      {signingIn ? (
        <p className="text-sm text-zinc-500">{copy.signingIn}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <main dir={dir} lang={lang} className="font-sans text-zinc-900 dark:text-zinc-50">
      <LandingHero copy={copy} languageSlot={languageSlot} ctaSlot={ctaSlot} />
      <LandingTrustStrip copy={copy.trust} />
      <LandingHowItWorks copy={copy.how} />
      <LandingBenefits copy={copy.benefits} />
      {showCta ? <LandingClosingCta copy={copy.closing} /> : null}
      <LandingFooter copy={copy} />
    </main>
  );
}
