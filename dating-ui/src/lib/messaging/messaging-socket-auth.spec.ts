/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jwtDecode } from "jwt-decode";
import {
  AuthRefreshError,
  coordinateRefreshAccessToken,
  resetRefreshCoordinatorForTests,
} from "@/lib/auth/auth-refresh-coordinator";
import {
  getCachedMessagingAccessToken,
  isAccessTokenStale,
  resetMessagingSocketAuthForTests,
  resolveMessagingAccessToken,
} from "./messaging-socket-auth";
import { tokenStorage } from "@/lib/auth/token-storage";

vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(),
}));

vi.mock("@/lib/auth/auth-refresh-coordinator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/auth/auth-refresh-coordinator")>();
  return {
    ...actual,
    coordinateRefreshAccessToken: vi.fn(),
  };
});

describe("isAccessTokenStale", () => {
  beforeEach(() => {
    vi.mocked(jwtDecode).mockReset();
  });

  it("returns false when exp is beyond refresh lead window", () => {
    vi.mocked(jwtDecode).mockReturnValue({
      exp: Math.floor((Date.now() + 120_000) / 1000),
    });
    expect(isAccessTokenStale("fresh-token")).toBe(false);
  });

  it("returns true when exp is within refresh lead window", () => {
    vi.mocked(jwtDecode).mockReturnValue({
      exp: Math.floor((Date.now() + 30_000) / 1000),
    });
    expect(isAccessTokenStale("soon-token")).toBe(true);
  });

  it("returns true when jwt decode fails", () => {
    vi.mocked(jwtDecode).mockImplementation(() => {
      throw new Error("bad jwt");
    });
    expect(isAccessTokenStale("bad-token")).toBe(true);
  });
});

describe("resolveMessagingAccessToken", () => {
  beforeEach(() => {
    resetMessagingSocketAuthForTests();
    resetRefreshCoordinatorForTests();
    vi.mocked(coordinateRefreshAccessToken).mockReset();
    vi.mocked(jwtDecode).mockReset();
    vi.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    vi.spyOn(tokenStorage, "getRefreshToken").mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMessagingSocketAuthForTests();
    resetRefreshCoordinatorForTests();
  });

  it("returns null when no access token in storage", async () => {
    await expect(resolveMessagingAccessToken()).resolves.toBeNull();
    expect(getCachedMessagingAccessToken()).toBeNull();
    expect(coordinateRefreshAccessToken).not.toHaveBeenCalled();
  });

  it("returns fresh access token and updates cache", async () => {
    vi.mocked(tokenStorage.getAccessToken).mockResolvedValue("access-fresh");
    vi.mocked(jwtDecode).mockReturnValue({
      exp: Math.floor((Date.now() + 120_000) / 1000),
    });

    await expect(resolveMessagingAccessToken()).resolves.toBe("access-fresh");
    expect(getCachedMessagingAccessToken()).toBe("access-fresh");
    expect(coordinateRefreshAccessToken).not.toHaveBeenCalled();
  });

  it("refreshes stale token when refresh token exists", async () => {
    vi.mocked(tokenStorage.getAccessToken).mockResolvedValue("access-stale");
    vi.mocked(tokenStorage.getRefreshToken).mockResolvedValue("refresh-1");
    vi.mocked(jwtDecode).mockReturnValue({
      exp: Math.floor((Date.now() + 10_000) / 1000),
    });
    vi.mocked(coordinateRefreshAccessToken).mockResolvedValue("access-new");

    await expect(resolveMessagingAccessToken()).resolves.toBe("access-new");
    expect(coordinateRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(getCachedMessagingAccessToken()).toBe("access-new");
  });

  it("returns null for stale token without refresh token (cookie path)", async () => {
    vi.mocked(tokenStorage.getAccessToken).mockResolvedValue("access-stale");
    vi.mocked(jwtDecode).mockReturnValue({
      exp: Math.floor((Date.now() + 10_000) / 1000),
    });

    await expect(resolveMessagingAccessToken()).resolves.toBeNull();
    expect(coordinateRefreshAccessToken).not.toHaveBeenCalled();
    expect(getCachedMessagingAccessToken()).toBeNull();
  });

  it("propagates AuthRefreshError from coordinator", async () => {
    vi.mocked(tokenStorage.getAccessToken).mockResolvedValue("access-stale");
    vi.mocked(tokenStorage.getRefreshToken).mockResolvedValue("refresh-1");
    vi.mocked(jwtDecode).mockReturnValue({
      exp: Math.floor((Date.now() + 10_000) / 1000),
    });
    vi.mocked(coordinateRefreshAccessToken).mockRejectedValue(
      new AuthRefreshError(401),
    );

    await expect(resolveMessagingAccessToken()).rejects.toBeInstanceOf(
      AuthRefreshError,
    );
    expect(getCachedMessagingAccessToken()).toBeNull();
  });
});
