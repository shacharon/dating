import { getApiBase } from "@/lib/api-base";
import type { AuthUser } from "@/lib/auth/types";

function parseUser(json: unknown): AuthUser | null {
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

export async function fetchAuthMe(): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; authError?: string }
> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 200) {
    const user = parseUser(await res.json());
    if (user) return { ok: true, user };
    return { ok: false, status: 500 };
  }
  if (res.status === 403) {
    let authError: string | undefined;
    try {
      const j = (await res.json()) as { auth_error?: string };
      authError = j.auth_error;
    } catch {
      /* ignore */
    }
    return { ok: false, status: 403, authError };
  }
  return { ok: false, status: res.status };
}

export async function exchangeGoogleIdToken(
  idToken: string,
): Promise<
  { ok: true; user: AuthUser } | { ok: false; status: number; message: string }
> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/auth/google`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });
  if (res.status === 200) {
    const user = parseUser(await res.json());
    if (user) return { ok: true, user };
    return { ok: false, status: 500, message: "Invalid response from server." };
  }
  let message = `Sign-in failed (${res.status}).`;
  try {
    const j = (await res.json()) as {
      message?: string | string[];
      auth_error?: string;
    };
    if (typeof j.message === "string") message = j.message;
    else if (Array.isArray(j.message) && j.message[0])
      message = String(j.message[0]);
    else if (j.auth_error) message = j.auth_error;
  } catch {
    /* keep default */
  }
  return { ok: false, status: res.status, message };
}

export async function authLogout(): Promise<boolean> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return res.ok;
}
