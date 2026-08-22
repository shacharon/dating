/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRequestIdContextForTests } from "@/lib/observability/request-id";
import {
  AuthRefreshError,
  coordinateRefreshAccessToken,
  resetRefreshCoordinatorForTests,
} from "./auth-refresh-coordinator";
import * as authApi from "./auth-api";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/lib/token-storage";

describe("auth-refresh-coordinator", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetRefreshCoordinatorForTests();
    resetRequestIdContextForTests();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    resetRefreshCoordinatorForTests();
  });

  it("stores rotated token pair and returns access token", async () => {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");
    vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
      ok: true,
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });

    const access = await coordinateRefreshAccessToken();
    expect(access).toBe("access-new");
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe("access-new");
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe(
      "refresh-new",
    );
  });

  it("dedupes concurrent refresh calls", async () => {
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

    const [a, b] = await Promise.all([
      coordinateRefreshAccessToken(),
      coordinateRefreshAccessToken(),
    ]);
    expect(a).toBe("access-new");
    expect(b).toBe("access-new");
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("throws AuthRefreshError when refresh token missing", async () => {
    await expect(coordinateRefreshAccessToken()).rejects.toBeInstanceOf(
      AuthRefreshError,
    );
  });
});
