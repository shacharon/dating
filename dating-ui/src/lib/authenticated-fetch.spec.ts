/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedFetch } from "./authenticated-fetch";
import * as authApi from "@/lib/auth/auth-api";
import * as coordinator from "@/lib/auth/auth-refresh-coordinator";
import * as revocation from "@/lib/auth/auth-session-revocation";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/lib/token-storage";

describe("authenticatedFetch", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    sessionStorage.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("attaches Bearer token when stored", async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "access-jwt");
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
    } as Response);

    await authenticatedFetch("/api/v1/me/matches");

    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/me/matches",
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-jwt");
  });

  it("refreshes on 401 and retries once", async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "expired");
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    vi.spyOn(coordinator, "coordinateRefreshAccessToken").mockResolvedValue(
      "access-new",
    );

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        headers: new Headers(),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers(),
      } as Response);

    const res = await authenticatedFetch("/api/v1/me/matches");
    expect(res.status).toBe(200);
    expect(coordinator.coordinateRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent 401 refresh via coordinator", async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "expired");
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    const refreshSpy = vi.spyOn(authApi, "refreshAccessToken").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                accessToken: "access-new",
                refreshToken: "refresh-new",
              }),
            20,
          );
        }),
    );

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        headers: new Headers(),
      } as Response)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        headers: new Headers(),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers(),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers(),
      } as Response);

    await Promise.all([
      authenticatedFetch("/api/v1/me/matches"),
      authenticatedFetch("/api/v1/me/profile"),
    ]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("notifies session revocation when refresh fails and cookie me fails", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    vi.spyOn(coordinator, "coordinateRefreshAccessToken").mockRejectedValue(
      new coordinator.AuthRefreshError(401),
    );
    vi.spyOn(authApi, "fetchAuthMe").mockResolvedValue({
      ok: false,
      status: 401,
    });
    const notifySpy = vi
      .spyOn(revocation, "notifyAuthSessionRevoked")
      .mockResolvedValue();

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    const res = await authenticatedFetch("/api/v1/me/matches");
    expect(res.status).toBe(401);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("skipAuthRefresh returns 401 without coordinator", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    const coordinateSpy = vi.spyOn(coordinator, "coordinateRefreshAccessToken");

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    const res = await authenticatedFetch("/api/v1/me/matches", {
      skipAuthRefresh: true,
    });
    expect(res.status).toBe(401);
    expect(coordinateSpy).not.toHaveBeenCalled();
  });

  it("does not refresh on 401 from auth endpoints", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    const coordinateSpy = vi.spyOn(coordinator, "coordinateRefreshAccessToken");

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    const res = await authenticatedFetch("/api/v1/auth/refresh", {
      method: "POST",
    });
    expect(res.status).toBe(401);
    expect(coordinateSpy).not.toHaveBeenCalled();
  });

  it("clears stale JWTs without logout when cookie session remains valid", async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "stale");
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    vi.spyOn(coordinator, "coordinateRefreshAccessToken").mockRejectedValue(
      new coordinator.AuthRefreshError(401),
    );
    vi.spyOn(authApi, "fetchAuthMe").mockResolvedValue({
      ok: true,
      status: 200,
      user: { id: "u1", email: "a@b.c" },
    });
    const notifySpy = vi
      .spyOn(revocation, "notifyAuthSessionRevoked")
      .mockResolvedValue();

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    await authenticatedFetch("/api/v1/me/matches");
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
