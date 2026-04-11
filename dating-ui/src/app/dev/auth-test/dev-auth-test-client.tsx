"use client";

import { getApiBase } from "@/lib/api-base";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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
  invalid_state: "OAuth state did not match (CSRF or stale cookie).",
  oauth_failed: "Google OAuth failed or was cancelled.",
  email_in_use: "That email is already linked to another account.",
  disabled_user: "This account is disabled.",
};

function parseSafeUser(json: unknown): SafeUser | null {
  if (json == null || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.email !== "string") return null;
  if (typeof o.status !== "string") return null;
  return {
    id: o.id,
    email: o.email,
    displayName: typeof o.displayName === "string" ? o.displayName : null,
    avatarUrl: typeof o.avatarUrl === "string" ? o.avatarUrl : null,
    status: o.status,
  };
}

export function DevAuthTestClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlAuthError = searchParams.get("auth_error");
  const [me, setMe] = useState<MeState>({ kind: "idle" });

  const base = useMemo(() => getApiBase(), []);

  const fetchMe = useCallback(async () => {
    setMe({ kind: "loading" });
    try {
      const res = await fetch(`${base}/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.status === 200) {
        const raw = (await res.json()) as unknown;
        const user = parseSafeUser(raw);
        if (user) {
          setMe({ kind: "ok", user });
          return;
        }
        setMe({
          kind: "error",
          message: "/auth/me returned 200 but body was not a safe user DTO.",
        });
        return;
      }
      if (res.status === 401) {
        setMe({ kind: "unauthorized" });
        return;
      }
      if (res.status === 403) {
        let authError: string | undefined;
        try {
          const j = (await res.json()) as { auth_error?: string };
          authError = j.auth_error;
        } catch {
          /* ignore */
        }
        setMe({ kind: "forbidden", authError });
        return;
      }
      setMe({
        kind: "error",
        message: `/auth/me HTTP ${res.status}`,
      });
    } catch (e) {
      setMe({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [base]);

  const loginWithGoogle = () => {
    window.location.href = `${base}/auth/google`;
  };

  const logout = async () => {
    setMe({ kind: "loading" });
    try {
      const res = await fetch(`${base}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        setMe({
          kind: "error",
          message: `/auth/logout HTTP ${res.status}`,
        });
        return;
      }
      setMe({ kind: "unauthorized" });
      router.replace("/dev/auth-test");
    } catch (e) {
      setMe({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
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
        <code className="break-all text-xs">{base}</code>
        <p className="mt-2 text-xs text-zinc-500">
          Env: <code>NEXT_PUBLIC_API_URL</code>. Login uses{" "}
          <code>{`GET ${base}/auth/google`}</code> (full redirect). Cookie session
          only — no JWT, no localStorage.
        </p>
      </section>

      {urlAuthError ? (
        <section
          className="rounded border border-amber-600 bg-amber-50 p-3 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
          data-testid="dev-auth-test-url-error"
        >
          <div className="font-semibold">auth_error (URL query after OAuth redirect)</div>
          <div className="mt-1 font-mono text-sm">{urlAuthError}</div>
          <div className="mt-2 text-xs">
            {AUTH_ERROR_LABELS[urlAuthError] ??
              "Unknown code — see dating-api auth_error contract."}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          onClick={loginWithGoogle}
          disabled={me.kind === "loading"}
        >
          Login with Google
        </button>
        <button
          type="button"
          className="rounded border border-zinc-400 px-3 py-2 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-900"
          onClick={() => void fetchMe()}
          disabled={me.kind === "loading"}
        >
          Who am I
        </button>
        <button
          type="button"
          className="rounded border border-red-700 px-3 py-2 text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
          onClick={() => void logout()}
          disabled={me.kind === "loading"}
        >
          Logout
        </button>
      </section>

      <section>
        <div className="mb-1 text-xs uppercase text-zinc-500">GET /auth/me</div>
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
        Click <strong>Who am I</strong> for <code>GET /auth/me</code> with{" "}
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
        Anonymous — 401 from <code>/auth/me</code>.
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
