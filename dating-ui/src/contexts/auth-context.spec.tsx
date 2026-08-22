/** @vitest-environment jsdom */
import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import * as authApi from "@/lib/auth/auth-api";
import * as coordinator from "@/lib/auth/auth-refresh-coordinator";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/lib/token-storage";

const routerReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
}));

vi.mock("@/lib/auth/auth-api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth/auth-api")>();
  return {
    ...mod,
    fetchAuthMeWithRetry: vi.fn(),
    exchangeGoogleIdToken: vi.fn(),
    authLogout: vi.fn(),
    fetchAuthMe: vi.fn(),
  };
});

vi.mock("@/lib/auth/auth-refresh-coordinator", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/lib/auth/auth-refresh-coordinator")>();
  return {
    ...mod,
    coordinateRefreshAccessToken: vi.fn(),
  };
});

const mockUser = {
  id: "u1",
  email: "a@b.com",
  displayName: "A",
  avatarUrl: null,
  status: "ACTIVE",
  emailNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("auth-context", () => {
  beforeEach(() => {
    sessionStorage.clear();
    routerReplace.mockClear();
    vi.mocked(authApi.fetchAuthMeWithRetry).mockResolvedValue({
      ok: true,
      user: mockUser,
    });
    vi.mocked(authApi.authLogout).mockResolvedValue(true);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("bootstrap resolves to authenticated", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });
    expect(result.current.user?.id).toBe("u1");
  });

  it("signInWithGoogleIdToken stores tokens and exposes getAccessToken", async () => {
    vi.mocked(authApi.exchangeGoogleIdToken).mockResolvedValue({
      ok: true,
      user: mockUser,
      accessToken: "access-jwt",
      refreshToken: "refresh-jwt",
    });
    vi.mocked(authApi.fetchAuthMeWithRetry).mockResolvedValue({
      ok: true,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    let signedIn = false;
    await act(async () => {
      signedIn = await result.current.signInWithGoogleIdToken("google-id");
    });
    expect(signedIn).toBe(true);
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe("access-jwt");
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe(
      "refresh-jwt",
    );
    await expect(result.current.getAccessToken()).resolves.toBe("access-jwt");
  });

  it("logout clears stored tokens", async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "access-jwt");
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-jwt");

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(authApi.authLogout).toHaveBeenCalledWith({
      accessToken: "access-jwt",
      refreshToken: "refresh-jwt",
    });
    expect(routerReplace).toHaveBeenCalledWith("/");
  });

  it("bootstrap falls back to refresh when cookie me returns 401", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "stored-refresh");
    vi.mocked(authApi.fetchAuthMeWithRetry).mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.mocked(coordinator.coordinateRefreshAccessToken).mockResolvedValue(
      "new-access",
    );
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "new-access");
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "new-refresh");
    vi.mocked(authApi.fetchAuthMe).mockResolvedValue({
      ok: true,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    expect(coordinator.coordinateRefreshAccessToken).toHaveBeenCalled();
    expect(authApi.fetchAuthMe).toHaveBeenCalledWith({
      accessToken: "new-access",
    });
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe("new-access");
  });

  it("bootstrap shows error when refresh fails with network error", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "stored-refresh");
    vi.mocked(authApi.fetchAuthMeWithRetry).mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.mocked(coordinator.coordinateRefreshAccessToken).mockRejectedValue(
      new coordinator.AuthRefreshError(0),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe(
      "stored-refresh",
    );
  });

  it("bootstrap clears tokens when refresh returns 401", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "stored-refresh");
    vi.mocked(authApi.fetchAuthMeWithRetry).mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.mocked(coordinator.coordinateRefreshAccessToken).mockRejectedValue(
      new coordinator.AuthRefreshError(401),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
