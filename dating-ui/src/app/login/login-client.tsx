"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signInWithGoogleIdToken, lastError, clearLastError } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const nextPath = useMemo(() => {
    const n = searchParams.get("next")?.trim();
    if (n?.startsWith("/") && !n.startsWith("//")) return n;
    return "/";
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(nextPath);
    }
  }, [status, router, nextPath]);

  const onGoogleCredential = useCallback(
    async (idToken: string) => {
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

  const showBootstrapLoading = status === "loading" && !signingIn;
  const showForm = status === "unauthenticated" || signingIn;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Log in
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Continue with your Google account. Session is stored in an HttpOnly cookie on
        the API — not in browser storage.
      </p>

      {showBootstrapLoading ? (
        <p className="text-sm text-zinc-500">Checking session…</p>
      ) : null}

      {showForm ? (
        <div className="space-y-4">
          {lastError ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
              role="alert"
            >
              {lastError}
            </div>
          ) : null}
          <div className="flex min-h-[44px] items-center">
            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={onGoogleCredential}
              disabled={signingIn}
            />
          </div>
          {signingIn ? (
            <p className="text-sm text-zinc-500">Signing you in…</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-10 text-center text-sm text-zinc-500">
        <Link href="/" className="text-blue-600 underline dark:text-blue-400">
          Back to home
        </Link>
      </p>
    </main>
  );
}
