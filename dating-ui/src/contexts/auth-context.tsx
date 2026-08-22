"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  authLogout,
  exchangeGoogleIdToken,
  fetchAuthMe,
  fetchAuthMeWithRetry,
  isTransientAuthMeFailure,
} from "@/lib/auth/auth-api";
import {
  AuthRefreshError,
  coordinateRefreshAccessToken,
} from "@/lib/auth/auth-refresh-coordinator";
import { createRefreshScheduler } from "@/lib/auth/auth-token-scheduler";
import { registerAuthSessionRevokedHandler } from "@/lib/auth/auth-session-revocation";
import type { AuthStatus, AuthUser } from "@/lib/auth/types";
import { setInAppNotificationsEnabledPreference } from "@/lib/message-in-app-notify";
import {
  emitProductLog,
  getObservabilityRoute,
} from "@/lib/observability/product-logger";
import { UiErrorCodes } from "@/lib/observability/ui-error-codes";
import { tokenStorage } from "@/lib/token-storage";
import { useRouter } from "next/navigation";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Runs `GET /api/v1/auth/me` with cookies; updates `user` / `status`. */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  /** `POST /api/v1/auth/google`; returns whether session was established. */
  signInWithGoogleIdToken: (idToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  lastError: string | null;
  clearLastError: () => void;
  /** Current access JWT from token storage (Story 3 API client). */
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function syncInAppNotificationPreference(user: AuthUser | null): void {
  setInAppNotificationsEnabledPreference(
    user?.inAppNotificationsEnabled ?? true,
  );
}

function apiUnavailableMessage(status: number): string {
  if (status === 0) {
    return "Cannot reach dating-api. Start it with: cd dating-api && npm run start:dev (port 3001). The UI proxies /api to API_PROXY_TARGET (default http://127.0.0.1:3001).";
  }
  return "dating-api is not responding (often restarting). Wait a few seconds and click Retry. If you recently pulled code, run: cd dating-api && npx prisma migrate deploy";
}

function isAuthRevocationFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const refreshSchedulerRef = useRef(createRefreshScheduler());
  const logoutRef = useRef<(() => Promise<void>) | null>(null);
  const scheduleTokenRefreshRef = useRef<(accessToken: string) => void>(
    () => {},
  );

  scheduleTokenRefreshRef.current = (accessToken: string) => {
    refreshSchedulerRef.current.schedule(accessToken, async () => {
      try {
        const newAccessToken = await coordinateRefreshAccessToken();
        scheduleTokenRefreshRef.current(newAccessToken);
      } catch (err) {
        if (
          err instanceof AuthRefreshError &&
          isAuthRevocationFailure(err.status)
        ) {
          const me = await fetchAuthMe();
          if (me.ok) {
            await tokenStorage.clearTokens();
            return;
          }
          await logoutRef.current?.();
        }
      }
    });
  };

  const scheduleTokenRefresh = useCallback((accessToken: string) => {
    scheduleTokenRefreshRef.current(accessToken);
  }, []);

  const tryRefreshTokenBootstrap = useCallback(async (): Promise<
    | { ok: true; user: AuthUser }
    | { ok: false; status: number; authError?: string }
  > => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await tokenStorage.clearTokens();
      return { ok: false, status: 401 };
    }
    try {
      const accessToken = await coordinateRefreshAccessToken();
      const me = await fetchAuthMe({ accessToken });
      if (me.ok) {
        scheduleTokenRefresh(accessToken);
      }
      return me;
    } catch (err) {
      if (err instanceof AuthRefreshError && isAuthRevocationFailure(err.status)) {
        await tokenStorage.clearTokens();
        return { ok: false, status: err.status };
      }
      const status = err instanceof AuthRefreshError ? err.status : 0;
      return { ok: false, status };
    }
  }, [scheduleTokenRefresh]);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) {
        setStatus("loading");
      }
      emitProductLog({
        level: "trace",
        route: getObservabilityRoute(),
        message: silent
          ? "auth bootstrap: silent refresh session"
          : "auth bootstrap: refresh session",
        errorCode: UiErrorCodes.UI_AUTH_BOOTSTRAP,
      });
      let r = await fetchAuthMeWithRetry(
        silent ? { profile: "silent" } : { profile: "bootstrap" },
      );
      if (!r.ok && r.status === 401) {
        r = await tryRefreshTokenBootstrap();
      }
      if (r.ok) {
        setLastError(null);
        setUser(r.user);
        syncInAppNotificationPreference(r.user);
        setStatus("authenticated");
        const accessToken = await tokenStorage.getAccessToken();
        if (accessToken) {
          scheduleTokenRefresh(accessToken);
        }
        return;
      }
      if (r.status === 401) {
        refreshSchedulerRef.current.clear();
        await tokenStorage.clearTokens();
        setUser(null);
        syncInAppNotificationPreference(null);
        setLastError(null);
        setStatus("unauthenticated");
        return;
      }
      if (isTransientAuthMeFailure(r.status)) {
        setUser(null);
        syncInAppNotificationPreference(null);
        setLastError(apiUnavailableMessage(r.status));
        setStatus("error");
        return;
      }
      setUser(null);
      syncInAppNotificationPreference(null);
      setLastError(null);
      setStatus("unauthenticated");
    },
    [scheduleTokenRefresh, tryRefreshTokenBootstrap],
  );

  useEffect(() => {
    registerAuthSessionRevokedHandler(() => logoutRef.current?.());
    return () => registerAuthSessionRevokedHandler(null);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      setLastError(null);
      setStatus("loading");
      const r = await exchangeGoogleIdToken(idToken);
      if (r.ok) {
        await tokenStorage.setTokenPair(r.accessToken, r.refreshToken);
        const verify = await fetchAuthMeWithRetry();
        if (verify.ok) {
          setUser(verify.user);
          syncInAppNotificationPreference(verify.user);
          setStatus("authenticated");
          scheduleTokenRefresh(r.accessToken);
          return true;
        }
        await tokenStorage.clearTokens();
        refreshSchedulerRef.current.clear();
        setUser(null);
        syncInAppNotificationPreference(null);
        if (isTransientAuthMeFailure(verify.status)) {
          setLastError(apiUnavailableMessage(verify.status));
          setStatus("error");
        } else {
          setLastError(
            "Login succeeded but session check failed — try Refresh or sign in again.",
          );
          setStatus("unauthenticated");
        }
        return false;
      }
      setUser(null);
      syncInAppNotificationPreference(null);
      setStatus("unauthenticated");
      setLastError(r.message);
      return false;
    },
    [scheduleTokenRefresh],
  );

  const logout = useCallback(async () => {
    setLastError(null);
    setStatus("loading");
    refreshSchedulerRef.current.clear();
    const accessToken = await tokenStorage.getAccessToken();
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await authLogout({ accessToken, refreshToken });
    } finally {
      await tokenStorage.clearTokens();
      queryClient.clear();
      setUser(null);
      syncInAppNotificationPreference(null);
      setStatus("unauthenticated");
      router.replace("/");
    }
  }, [router, queryClient]);

  logoutRef.current = logout;

  const getAccessToken = useCallback(
    () => tokenStorage.getAccessToken(),
    [],
  );

  const clearLastError = useCallback(() => setLastError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      refresh,
      signInWithGoogleIdToken,
      logout,
      lastError,
      clearLastError,
      getAccessToken,
    }),
    [
      status,
      user,
      refresh,
      signInWithGoogleIdToken,
      logout,
      lastError,
      clearLastError,
      getAccessToken,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
