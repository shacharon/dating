import { apiUrl } from "@/lib/api/api-base";
import { fetchAuthMe } from "@/lib/auth/auth-api";
import {
  AuthRefreshError,
  coordinateRefreshAccessToken,
} from "@/lib/auth/auth-refresh-coordinator";
import { notifyAuthSessionRevoked } from "@/lib/auth/auth-session-revocation";
import { tokenStorage } from "@/lib/auth/token-storage";

export type AuthenticatedFetchInit = RequestInit & {
  /** When true, return 401 without refresh attempt. */
  skipAuthRefresh?: boolean;
};

function resolveUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("/")) {
    return apiUrl(pathOrUrl);
  }
  return pathOrUrl;
}

function isAuthEndpoint(pathOrUrl: string): boolean {
  const resolved = resolveUrl(pathOrUrl);
  try {
    const path = resolved.startsWith("/")
      ? resolved
      : new URL(resolved).pathname;
    return path.startsWith("/api/v1/auth/");
  } catch {
    return false;
  }
}

function isAuthRevocationFailure(status: number): boolean {
  return status === 401 || status === 403;
}

function mergeHeaders(init?: RequestInit): Headers {
  const headers = new Headers();
  const source = init?.headers;
  if (source instanceof Headers) {
    source.forEach((value, key) => headers.set(key, value));
  } else if (Array.isArray(source)) {
    for (const [key, value] of source) {
      headers.set(key, value);
    }
  } else if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(source)) {
      if (value != null) {
        headers.set(key, String(value));
      }
    }
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return headers;
}

async function performFetch(
  pathOrUrl: string,
  init?: AuthenticatedFetchInit,
): Promise<Response> {
  const headers = mergeHeaders(init);

  const accessToken = await tokenStorage.getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const { skipAuthRefresh: _skipAuthRefresh, ...fetchInit } = init ?? {};

  return fetch(resolveUrl(pathOrUrl), {
    ...fetchInit,
    headers,
    credentials: "include",
  });
}

export async function authenticatedFetch(
  pathOrUrl: string,
  init?: AuthenticatedFetchInit,
): Promise<Response> {
  const skipAuthRefresh = init?.skipAuthRefresh === true;
  let response = await performFetch(pathOrUrl, init);

  if (
    response.status !== 401 ||
    skipAuthRefresh ||
    isAuthEndpoint(pathOrUrl)
  ) {
    return response;
  }

  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return response;
  }

  try {
    await coordinateRefreshAccessToken();
  } catch (err) {
    if (
      err instanceof AuthRefreshError &&
      isAuthRevocationFailure(err.status)
    ) {
      const me = await fetchAuthMe();
      if (me.ok) {
        await tokenStorage.clearTokens();
        return response;
      }
      await notifyAuthSessionRevoked();
    }
    return response;
  }

  return performFetch(pathOrUrl, init);
}
