import { getApiBase } from "@/lib/api-base";
import type { AuthUser } from "@/lib/auth/types";
import {
  clearStoredReferralRef,
  readStoredReferralRef,
} from "@/lib/referral-attribution";
import {
  emitProductLog,
  getObservabilityRoute,
} from "@/lib/observability/product-logger";
import { captureRequestIdFromResponse } from "@/lib/observability/request-id";
import { UiErrorCodes } from "@/lib/observability/ui-error-codes";

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
    emailNotificationsEnabled:
      typeof o.emailNotificationsEnabled === "boolean"
        ? o.emailNotificationsEnabled
        : true,
    inAppNotificationsEnabled:
      typeof o.inAppNotificationsEnabled === "boolean"
        ? o.inAppNotificationsEnabled
        : true,
  };
}

/** Parse wrapped google login body; null if shape invalid. */
export function parseAuthTokenLoginResponse(json: unknown): {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
} | null {
  if (json == null || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.accessToken !== "string" || typeof o.refreshToken !== "string") {
    return null;
  }
  const user = parseUser(o.user);
  if (!user) return null;
  return {
    user,
    accessToken: o.accessToken,
    refreshToken: o.refreshToken,
  };
}

function parseRefreshResponse(json: unknown): {
  accessToken: string;
  refreshToken: string;
} | null {
  if (json == null || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.accessToken !== "string" || typeof o.refreshToken !== "string") {
    return null;
  }
  return { accessToken: o.accessToken, refreshToken: o.refreshToken };
}

/** Covers nest `--watch` restarts (~5–15s) without treating logged-out users as errors. */
const AUTH_ME_BOOTSTRAP_RETRY_DELAYS_MS = [
  250, 500, 750, 1000, 1500, 2000, 2500, 3000,
] as const;

/** Background refresh — do not block UI for minutes when API is down. */
const AUTH_ME_SILENT_RETRY_DELAYS_MS = [200, 400] as const;

export type AuthMeRetryOptions = {
  maxAttempts?: number;
  /** bootstrap: first load (default). silent: tab focus / background refresh. */
  profile?: "bootstrap" | "silent";
  /** Optional Bearer token for cookie-less bootstrap (mobile prep). */
  accessToken?: string | null;
};

function retryDelaysForProfile(
  profile: AuthMeRetryOptions["profile"],
): readonly number[] {
  return profile === "silent"
    ? AUTH_ME_SILENT_RETRY_DELAYS_MS
    : AUTH_ME_BOOTSTRAP_RETRY_DELAYS_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Transient: API down, proxy error, or nest watch restart (not logged out). */
export function isTransientAuthMeFailure(status: number): boolean {
  return status === 0 || status >= 500;
}

/**
 * Bootstrap auth check with retries — avoids false "server error" when dating-api
 * is still starting or briefly restarting (`nest start --watch`).
 */
export async function fetchAuthMeWithRetry(
  options?: AuthMeRetryOptions,
): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; authError?: string }
> {
  const profile = options?.profile ?? "bootstrap";
  const delays = retryDelaysForProfile(profile);
  const maxAttempts = options?.maxAttempts ?? delays.length + 1;
  let last: Awaited<ReturnType<typeof fetchAuthMe>> = { ok: false, status: 0 };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await fetchAuthMe({ accessToken: options?.accessToken });
    if (last.ok || !isTransientAuthMeFailure(last.status)) {
      return last;
    }
    const delay = delays[attempt];
    if (delay == null) break;
    await sleep(delay);
  }

  return last;
}

export type FetchAuthMeOptions = {
  accessToken?: string | null;
};

export async function fetchAuthMe(
  options?: FetchAuthMeOptions,
): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; authError?: string }
> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/me`, {
      method: "GET",
      credentials: "include",
      headers,
    });
  } catch {
    /** DNS, refused connection, CORS block, offline — `fetch` rejects (no HTTP status). */
    emitProductLog({
      level: "error",
      route,
      message: "GET /api/v1/auth/me network failure",
      errorCode: UiErrorCodes.UI_AUTH_ME_NETWORK,
    });
    return { ok: false, status: 0 };
  }
  captureRequestIdFromResponse(res);
  if (res.status === 200) {
    const user = parseUser(await res.json());
    if (user) {
      emitProductLog({
        level: "trace",
        route,
        message: "GET /api/v1/auth/me success",
        errorCode: UiErrorCodes.UI_AUTH_ME_OK,
        meta: { userId: user.id },
      });
      return { ok: true, user };
    }
    emitProductLog({
      level: "error",
      route,
      message: "GET /api/v1/auth/me invalid JSON body",
      errorCode: UiErrorCodes.UI_AUTH_ME_UNEXPECTED,
      meta: { status: res.status },
    });
    return { ok: false, status: 500 };
  }
  if (res.status === 401) {
    emitProductLog({
      level: "trace",
      route,
      message: "GET /api/v1/auth/me unauthenticated",
      errorCode: UiErrorCodes.UI_AUTH_ME_UNAUTHORIZED,
      meta: { status: 401 },
    });
    return { ok: false, status: 401 };
  }
  if (res.status === 403) {
    let authError: string | undefined;
    try {
      const j = (await res.json()) as { auth_error?: string };
      authError = j.auth_error;
    } catch {
      /* ignore */
    }
    emitProductLog({
      level: "error",
      route,
      message: "GET /api/v1/auth/me forbidden",
      errorCode: UiErrorCodes.UI_AUTH_ME_FORBIDDEN,
      meta: { authError },
    });
    return { ok: false, status: 403, authError };
  }
  emitProductLog({
    level: "error",
    route,
    message: `GET /api/v1/auth/me unexpected status ${res.status}`,
    errorCode: UiErrorCodes.UI_AUTH_ME_UNEXPECTED,
    meta: { status: res.status },
  });
  return { ok: false, status: res.status };
}

export async function exchangeGoogleIdToken(
  idToken: string,
): Promise<
  | {
      ok: true;
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }
  | { ok: false; status: number; message: string }
> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  const referredByUserId = readStoredReferralRef();
  const body: { idToken: string; referredByUserId?: string } = { idToken };
  if (referredByUserId) {
    body.referredByUserId = referredByUserId;
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/google`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    emitProductLog({
      level: "error",
      route,
      message: "POST /api/v1/auth/google network failure",
      errorCode: UiErrorCodes.UI_AUTH_GOOGLE_EXCHANGE_FAIL,
      meta: { reason: "network" },
    });
    return {
      ok: false,
      status: 0,
      message: "Cannot reach the API server. Is dating-api running?",
    };
  }
  captureRequestIdFromResponse(res);
  if (res.status === 200) {
    const parsed = parseAuthTokenLoginResponse(await res.json());
    if (parsed) {
      clearStoredReferralRef();
      emitProductLog({
        level: "trace",
        route,
        message: "POST /api/v1/auth/google success",
        errorCode: UiErrorCodes.UI_AUTH_GOOGLE_EXCHANGE_OK,
        meta: { userId: parsed.user.id },
      });
      return { ok: true, ...parsed };
    }
    emitProductLog({
      level: "error",
      route,
      message: "POST /api/v1/auth/google invalid response body",
      errorCode: UiErrorCodes.UI_AUTH_GOOGLE_EXCHANGE_FAIL,
      meta: { status: res.status },
    });
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
  emitProductLog({
    level: "error",
    route,
    message: "POST /api/v1/auth/google failed",
    errorCode: UiErrorCodes.UI_AUTH_GOOGLE_EXCHANGE_FAIL,
    meta: { status: res.status, clientMessage: message },
  });
  return { ok: false, status: res.status, message };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; status: number }
> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    emitProductLog({
      level: "error",
      route,
      message: "POST /api/v1/auth/refresh network failure",
      errorCode: UiErrorCodes.UI_AUTH_REFRESH_NETWORK,
    });
    return { ok: false, status: 0 };
  }
  captureRequestIdFromResponse(res);
  if (res.status === 200) {
    const parsed = parseRefreshResponse(await res.json());
    if (parsed) {
      emitProductLog({
        level: "trace",
        route,
        message: "POST /api/v1/auth/refresh success",
        errorCode: UiErrorCodes.UI_AUTH_REFRESH_OK,
      });
      return { ok: true, ...parsed };
    }
    emitProductLog({
      level: "error",
      route,
      message: "POST /api/v1/auth/refresh invalid response body",
      errorCode: UiErrorCodes.UI_AUTH_REFRESH_FAIL,
      meta: { status: res.status },
    });
    return { ok: false, status: 500 };
  }
  emitProductLog({
    level: "error",
    route,
    message: `POST /api/v1/auth/refresh failed status ${res.status}`,
    errorCode: UiErrorCodes.UI_AUTH_REFRESH_FAIL,
    meta: { status: res.status },
  });
  return { ok: false, status: res.status };
}

export type AuthLogoutOptions = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

export async function authLogout(
  options?: AuthLogoutOptions,
): Promise<boolean> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  const refreshToken = options?.refreshToken?.trim();
  const init: RequestInit = {
    method: "POST",
    credentials: "include",
    headers,
  };
  if (refreshToken) {
    init.headers = {
      ...headers,
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify({ refreshToken });
  }
  try {
    const res = await fetch(`${base}/api/v1/auth/logout`, init);
    captureRequestIdFromResponse(res);
    if (res.ok) {
      emitProductLog({
        level: "trace",
        route,
        message: "POST /api/v1/auth/logout success",
        errorCode: UiErrorCodes.UI_AUTH_LOGOUT_OK,
      });
      return true;
    }
    emitProductLog({
      level: "error",
      route,
      message: `POST /api/v1/auth/logout failed status ${res.status}`,
      errorCode: UiErrorCodes.UI_AUTH_LOGOUT_FAIL,
      meta: { status: res.status },
    });
    return false;
  } catch {
    emitProductLog({
      level: "error",
      route,
      message: "POST /api/v1/auth/logout network failure",
      errorCode: UiErrorCodes.UI_AUTH_LOGOUT_NETWORK,
    });
    return false;
  }
}
