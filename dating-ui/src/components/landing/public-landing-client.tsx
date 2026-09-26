"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { DemoLanguageLinks } from "@/components/landing/demo-language-links";
import { demoLanguageLinks } from "@/lib/platform/demo-language-links";
import { LanguagePicker } from "@/components/language-picker";
import { useAuth } from "@/contexts/auth-context";
import {
  getLocaleDirection,
  getLocaleHtmlLang,
  useAppLocale,
  writeStoredLocale,
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
import { datingApi } from "@/lib/api-sdk";
import { postLoginPath } from "@/lib/profile/onboarding-path";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LandingBenefits } from "./landing-benefits";
import { LandingClosingCta } from "./landing-closing-cta";
import { LandingFooter } from "./landing-footer";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingTrustStrip } from "./landing-trust-strip";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

function safeNextPath(raw: string | null): string | null {
  const n = raw?.trim();
  if (n?.startsWith("/") && !n.startsWith("//")) return n;
  return null;
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

  const requestedNext = useMemo(() => {
    const next = safeNextPath(searchParams.get("next"));
    if (next?.startsWith("/onboarding")) return null;
    return next;
  }, [searchParams]);

  useEffect(() => {
    const next = searchParams.get("next");
    if (!next?.startsWith("/onboarding")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("next");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [searchParams]);

  const goAfterLogin = useCallback(async () => {
    try {
      const profile = await datingApi.profile.fetchMyProfile();
      router.replace(postLoginPath(profile, requestedNext));
    } catch {
      router.replace(postLoginPath(null, requestedNext));
    }
  }, [requestedNext, router]);

  useEffect(() => {
    if (status === "authenticated") {
      void goAfterLogin();
    }
  }, [status, goAfterLogin]);

  const localeQuery = searchParams.get("locale");
  useEffect(() => {
    if (localeQuery !== "en" && localeQuery !== "es" && localeQuery !== "he") {
      return;
    }
    writeStoredLocale(localeQuery);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("locale");
    const qs = next.toString();
    const path = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", path);
  }, [localeQuery, searchParams]);

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
        meta: { nextPath: requestedNext },
      });
      clearLastError();
      setSigningIn(true);
      try {
        const ok = await signInWithGoogleIdToken(idToken);
        if (ok) await goAfterLogin();
      } finally {
        setSigningIn(false);
      }
    },
    [signInWithGoogleIdToken, goAfterLogin, requestedNext, clearLastError],
  );

  const showBootstrapLoading =
    status === "loading" && hasSessionCookie() && !signingIn;
  const showCta =
    status === "unauthenticated" || status === "error" || signingIn;

  const [hostname, setHostname] = useState("");
  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);
  const showDemoLinks =
    showCta && demoLanguageLinks({ hostname, locale }).length > 0;
  const languageSlot = !showCta ? null : showDemoLinks ? (
    <DemoLanguageLinks locale={locale} hostname={hostname} />
  ) : (
    <LanguagePicker
      locale={locale}
      className="max-w-[11rem] rounded-md border border-zinc-200/80 bg-white/80 px-2 py-1 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-950/80"
      id="landing-language-picker"
    />
  );

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
      <LandingHero
        copy={copy}
        languageSlot={languageSlot}
        ctaSlot={ctaSlot}
        showSignedOutHint={showCta}
      />
      <LandingTrustStrip copy={copy.trust} />
      <LandingHowItWorks copy={copy.how} />
      <LandingBenefits copy={copy.benefits} />
      {showCta ? <LandingClosingCta copy={copy.closing} /> : null}
      <LandingFooter copy={copy} />
    </main>
  );
}
