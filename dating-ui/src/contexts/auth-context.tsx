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
import {
  authLogout,
  exchangeGoogleIdToken,
  fetchAuthMe,
} from "@/lib/auth/auth-api";
import type { AuthStatus, AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Runs `GET /api/v1/auth/me` with cookies; updates `user` / `status`. */
  refresh: () => Promise<void>;
  /** `POST /api/v1/auth/google`; returns whether session was established. */
  signInWithGoogleIdToken: (idToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  lastError: string | null;
  clearLastError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    const r = await fetchAuthMe();
    if (r.ok) {
      setUser(r.user);
      setStatus("authenticated");
      return;
    }
    if (r.status === 401) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    setUser(null);
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
      // Confirm session cookie is sent and accepted (same as full-page refresh path).
      const verify = await fetchAuthMe();
      if (verify.ok) {
        setUser(verify.user);
        setStatus("authenticated");
        return true;
      }
      setUser(null);
      setStatus("unauthenticated");
      setLastError(
        "Login succeeded but GET /api/v1/auth/me did not return 200 — check CORS credentials and cookie domain.",
      );
      return false;
    }
    setUser(null);
    setStatus("unauthenticated");
    setLastError(r.message);
    return false;
  }, []);

  const logout = useCallback(async () => {
    setLastError(null);
    await authLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

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
