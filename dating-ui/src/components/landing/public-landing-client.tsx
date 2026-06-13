"use client";

import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuth } from "@/contexts/auth-context";
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
 * Public entry: Hebrew copy + Google CTA. Session is established only via
 * `POST /api/v1/auth/google` + HttpOnly cookie (see `AuthProvider`).
 */
export function PublicLandingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signInWithGoogleIdToken, lastError, clearLastError, refresh } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);

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

  /** Only block landing when a session cookie might auto-redirect (avoid blank wait for new visitors). */
  const showBootstrapLoading =
    status === "loading" && hasSessionCookie() && !signingIn;
  const showCta =
    status === "unauthenticated" || status === "error" || signingIn;

  return (
    <main
      dir="rtl"
      lang="he"
      className="mx-auto flex min-h-[calc(100dvh-0px)] max-w-lg flex-col justify-center px-6 py-16"
    >
      <h1 className="mb-3 text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        הגעת לירושלים
      </h1>
      <p className="mb-10 text-center text-lg text-zinc-600 dark:text-zinc-400">
        בוא תעשה Login
      </p>

      {showBootstrapLoading ? (
        <p className="text-center text-sm text-zinc-500">בודקים התחברות…</p>
      ) : null}

      {showCta ? (
        <div className="space-y-4">
          {lastError ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-right text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
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
              Retry connection to API
            </button>
          ) : null}
          <div className="flex min-h-[48px] flex-col items-center gap-3">
            <p className="text-center text-base font-medium text-zinc-800 dark:text-zinc-200">
              התחברות עם Google
            </p>
            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={onGoogleCredential}
              disabled={signingIn}
            />
          </div>
          {signingIn ? (
            <p className="text-center text-sm text-zinc-500">מתחברים…</p>
          ) : null}
        </div>
      ) : null}

      <footer
        dir="ltr"
        lang="en"
        className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Privacy
        </Link>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Terms
        </Link>
      </footer>
    </main>
  );
}
