import { jwtDecode } from "jwt-decode";
import {
  AuthRefreshError,
  coordinateRefreshAccessToken,
} from "@/lib/auth/auth-refresh-coordinator";
import { REFRESH_LEAD_MS } from "@/lib/auth/auth-token-scheduler";
import { tokenStorage } from "@/lib/token-storage";

let cachedAccessToken: string | null = null;

export function isAccessTokenStale(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (typeof decoded.exp !== "number") {
      return true;
    }
    return decoded.exp * 1000 <= Date.now() + REFRESH_LEAD_MS;
  } catch {
    return true;
  }
}

/** Sync read for reconnect_attempt — updated by {@link resolveMessagingAccessToken}. */
export function getCachedMessagingAccessToken(): string | null {
  return cachedAccessToken;
}

/** Returns access JWT for WS handshake, or null for cookie-only path. */
export async function resolveMessagingAccessToken(): Promise<string | null> {
  const raw = await tokenStorage.getAccessToken();
  if (!raw) {
    cachedAccessToken = null;
    return null;
  }

  if (!isAccessTokenStale(raw)) {
    cachedAccessToken = raw;
    return raw;
  }

  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) {
    cachedAccessToken = null;
    return null;
  }

  try {
    const fresh = await coordinateRefreshAccessToken();
    cachedAccessToken = fresh;
    return fresh;
  } catch (err) {
    cachedAccessToken = null;
    if (err instanceof AuthRefreshError) {
      throw err;
    }
    return null;
  }
}

/** @internal Vitest-only — reset module cache between tests. */
export function resetMessagingSocketAuthForTests(): void {
  cachedAccessToken = null;
}
