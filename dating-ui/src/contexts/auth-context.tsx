"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  authLogout,
  exchangeGoogleIdToken,
  fetchAuthMeWithRetry,
  isTransientAuthMeFailure,
} from "@/lib/auth/auth-api";
import type { AuthStatus, AuthUser } from "@/lib/auth/types";
import { setInAppNotificationsEnabledPreference } from "@/lib/message-in-app-notify";
import {
  emitProductLog,
  getObservabilityRoute,
} from "@/lib/observability/product-logger";
import { UiErrorCodes } from "@/lib/observability/ui-error-codes";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
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
    const r = await fetchAuthMeWithRetry(
      silent ? { profile: "silent" } : { profile: "bootstrap" },
    );
    if (r.ok) {
      setLastError(null);
      setUser(r.user);
      syncInAppNotificationPreference(r.user);
      setStatus("authenticated");
      return;
    }
    if (r.status === 401) {
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
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const signInWithGoogleIdToken = useCallback(async (idToken: string) => {
    setLastError(null);
    setStatus("loading");
    const r = await exchangeGoogleIdToken(idToken);
    if (r.ok) {
      const verify = await fetchAuthMeWithRetry();
      if (verify.ok) {
        setUser(verify.user);
        syncInAppNotificationPreference(verify.user);
        setStatus("authenticated");
        return true;
      }
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
  }, []);

  const logout = useCallback(async () => {
    setLastError(null);
    setStatus("loading");
    try {
      await authLogout();
    } finally {
      queryClient.clear();
      setUser(null);
      syncInAppNotificationPreference(null);
      setStatus("unauthenticated");
      router.replace("/");
    }
  }, [router, queryClient]);

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
    }),
    [
      status,
      user,
      refresh,
      signInWithGoogleIdToken,
      logout,
      lastError,
      clearLastError,
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
