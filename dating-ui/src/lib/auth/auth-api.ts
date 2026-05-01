import { getApiBase } from "@/lib/api-base";
import type { AuthUser } from "@/lib/auth/types";
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
  };
}

export async function fetchAuthMe(): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; authError?: string }
> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
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
  { ok: true; user: AuthUser } | { ok: false; status: number; message: string }
> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/google`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
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
    const user = parseUser(await res.json());
    if (user) {
      emitProductLog({
        level: "trace",
        route,
        message: "POST /api/v1/auth/google success",
        errorCode: UiErrorCodes.UI_AUTH_GOOGLE_EXCHANGE_OK,
        meta: { userId: user.id },
      });
      return { ok: true, user };
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

export async function authLogout(): Promise<boolean> {
  const base = getApiBase();
  const route = getObservabilityRoute();
  try {
    const res = await fetch(`${base}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
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
