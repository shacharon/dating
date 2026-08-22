/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  createTokenStorage,
} from "./token-storage";

describe("token-storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("stores and retrieves token pair in sessionStorage", async () => {
    const storage = createTokenStorage();
    await storage.setTokenPair("access-1", "refresh-1");
    expect(await storage.getAccessToken()).toBe("access-1");
    expect(await storage.getRefreshToken()).toBe("refresh-1");
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe("access-1");
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe("refresh-1");
  });

  it("hydrates in-memory cache from sessionStorage on read", async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "stored-access");
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "stored-refresh");
    const storage = createTokenStorage();
    expect(await storage.getAccessToken()).toBe("stored-access");
    expect(await storage.getRefreshToken()).toBe("stored-refresh");
  });

  it("clearTokens removes memory and sessionStorage keys", async () => {
    const storage = createTokenStorage();
    await storage.setTokenPair("a", "r");
    await storage.clearTokens();
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
