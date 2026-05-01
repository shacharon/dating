"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { exchangeGoogleIdToken, fetchAuthMe } from "@/lib/auth/auth-api";
import { useAuth } from "@/contexts/auth-context";
import { getApiBase } from "@/lib/api-base";
import { useCallback, useMemo, useState } from "react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

type SafeUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
};

type MeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; user: SafeUser }
  | { kind: "unauthorized" }
  | { kind: "forbidden"; authError?: string }
  | { kind: "error"; message: string };

const AUTH_ERROR_LABELS: Record<string, string> = {
  email_in_use: "That email is already linked to another account.",
  disabled_user: "This account is disabled.",
};

export function DevAuthTestClient() {
  const { logout: authLogoutAndRedirect } = useAuth();
  const [me, setMe] = useState<MeState>({ kind: "idle" });
  const [signingIn, setSigningIn] = useState(false);
  const [lastSignInError, setLastSignInError] = useState<string | null>(null);

  const base = useMemo(() => getApiBase(), []);

  const runFetchMe = useCallback(async () => {
    setMe({ kind: "loading" });
    const r = await fetchAuthMe();
    if (r.ok) {
      setMe({ kind: "ok", user: r.user });
      return;
    }
    if (r.status === 401) {
      setMe({ kind: "unauthorized" });
      return;
    }
    if (r.status === 403) {
      setMe({ kind: "forbidden", authError: r.authError });
      return;
    }
    if (r.status === 0) {
      setMe({
        kind: "error",
        message:
          "Cannot reach the API (network). With no NEXT_PUBLIC_API_URL, the UI uses same-origin /api — start dating-api and ensure next.config rewrites /api to it.",
      });
      return;
    }
    setMe({
      kind: "error",
      message: `GET /api/v1/auth/me returned HTTP ${r.status}`,
    });
  }, []);

  const onGoogleCredential = useCallback(async (idToken: string) => {
    setLastSignInError(null);
    setSigningIn(true);
    try {
      const r = await exchangeGoogleIdToken(idToken);
      if (!r.ok) {
        setLastSignInError(r.message);
        setMe({ kind: "unauthorized" });
        return;
      }
      const verify = await fetchAuthMe();
      if (!verify.ok) {
        setLastSignInError(
          "POST /api/v1/auth/google succeeded but GET /api/v1/auth/me did not return 200.",
        );
        setMe({ kind: "unauthorized" });
        return;
      }
      setMe({ kind: "ok", user: verify.user });
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = async () => {
    setMe({ kind: "loading" });
    await authLogoutAndRedirect();
  };

  const sessionSummary = sessionStateLabel(me);

  return (
    <div className="space-y-6 border border-dashed border-zinc-400 p-4 dark:border-zinc-600">
      <section
        className="rounded border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-900/50"
        aria-live="polite"
      >
        <div className="text-xs uppercase text-zinc-500">Session state</div>
        <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
          {sessionSummary}
        </p>
      </section>

      <section>
        <div className="mb-1 text-xs uppercase text-zinc-500">API base</div>
        <code className="break-all text-xs">{base || "(same-origin)"}</code>
        <p className="mt-2 text-xs text-zinc-500">
          Product paths: <code>GET /api/v1/auth/me</code>,{" "}
          <code>POST /api/v1/auth/google</code>, <code>POST /api/v1/auth/logout</code>{" "}
          with <code>{`credentials: 'include'`}</code>. Same session cookie as the main app.
        </p>
      </section>

      {lastSignInError ? (
        <section
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
          role="alert"
        >
          {lastSignInError}
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <div className="flex min-h-[44px] items-center">
          <GoogleSignInButton
            clientId={googleClientId}
            onCredential={onGoogleCredential}
            disabled={signingIn || me.kind === "loading"}
          />
        </div>
        <button
          type="button"
          className="rounded border border-zinc-400 px-3 py-2 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-900"
          onClick={() => void runFetchMe()}
          disabled={me.kind === "loading" || signingIn}
        >
          Who am I
        </button>
        <button
          type="button"
          className="rounded border border-red-700 px-3 py-2 text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
          onClick={() => void logout()}
          disabled={me.kind === "loading" || signingIn}
        >
          Logout
        </button>
      </section>
      {signingIn ? (
        <p className="text-xs text-zinc-500">Signing in…</p>
      ) : null}

      <section>
        <div className="mb-1 text-xs uppercase text-zinc-500">
          GET /api/v1/auth/me
        </div>
        <AuthMePanel me={me} />
      </section>
    </div>
  );
}

function sessionStateLabel(me: MeState): string {
  switch (me.kind) {
    case "idle":
      return "Anonymous (not loaded — click Who am I)";
    case "loading":
      return "Loading…";
    case "unauthorized":
      return "Anonymous (401 / not signed in)";
    case "ok":
      return `Authenticated (${me.user.email})`;
    case "forbidden":
      return "Authenticated session rejected (403 — e.g. disabled)";
    case "error":
      return `Error: ${me.message}`;
    default:
      return "Unknown";
  }
}

function AuthMePanel({ me }: { me: MeState }) {
  if (me.kind === "idle") {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Click <strong>Who am I</strong> for <code>GET /api/v1/auth/me</code> with{" "}
        <code>{`credentials: 'include'`}</code>.
      </p>
    );
  }
  if (me.kind === "loading") {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }
  if (me.kind === "unauthorized") {
    return (
      <p className="font-medium text-orange-700 dark:text-orange-400">
        Anonymous — 401 from <code>/api/v1/auth/me</code>.
      </p>
    );
  }
  if (me.kind === "forbidden") {
    const label = me.authError
      ? AUTH_ERROR_LABELS[me.authError] ?? me.authError
      : undefined;
    return (
      <div>
        <p className="font-medium text-red-700 dark:text-red-400">
          403 Forbidden
        </p>
        {me.authError ? (
          <p className="mt-2 font-mono text-xs">
            auth_error: {me.authError}
            {label && label !== me.authError ? (
              <span className="mt-1 block text-zinc-600 dark:text-zinc-400">
                {label}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    );
  }
  if (me.kind === "error") {
    return <p className="text-red-600 dark:text-red-400">Error: {me.message}</p>;
  }
  const u = me.user;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      <dt className="text-zinc-500">id</dt>
      <dd className="font-mono">{u.id}</dd>
      <dt className="text-zinc-500">email</dt>
      <dd>{u.email}</dd>
      <dt className="text-zinc-500">displayName</dt>
      <dd>{u.displayName ?? "—"}</dd>
      <dt className="text-zinc-500">avatarUrl</dt>
      <dd className="break-all">{u.avatarUrl ?? "—"}</dd>
      <dt className="text-zinc-500">status</dt>
      <dd>{u.status}</dd>
    </dl>
  );
}
