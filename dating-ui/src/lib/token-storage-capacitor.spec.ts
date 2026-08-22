/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/lib/token-storage-types";
import { setPlatformOverrideForTests } from "@/lib/platform";
import {
  resetCapacitorTokenStorageForTests,
} from "@/lib/token-storage-capacitor";
import { createTokenStorage } from "@/lib/token-storage";

const preferenceStore = new Map<string, string>();

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: preferenceStore.get(key) ?? null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      preferenceStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      preferenceStore.delete(key);
    }),
  },
}));

describe("token-storage (capacitor)", () => {
  beforeEach(() => {
    preferenceStore.clear();
    sessionStorage.clear();
    setPlatformOverrideForTests("capacitor");
    resetCapacitorTokenStorageForTests();
  });

  afterEach(() => {
    setPlatformOverrideForTests(null);
    preferenceStore.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("stores and retrieves token pair via Preferences", async () => {
    const storage = createTokenStorage();
    await storage.setTokenPair("access-cap", "refresh-cap");
    expect(await storage.getAccessToken()).toBe("access-cap");
    expect(await storage.getRefreshToken()).toBe("refresh-cap");
    expect(preferenceStore.get(ACCESS_TOKEN_STORAGE_KEY)).toBe("access-cap");
    expect(preferenceStore.get(REFRESH_TOKEN_STORAGE_KEY)).toBe("refresh-cap");
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("hydrates in-memory cache from Preferences on read", async () => {
    preferenceStore.set(ACCESS_TOKEN_STORAGE_KEY, "stored-access");
    preferenceStore.set(REFRESH_TOKEN_STORAGE_KEY, "stored-refresh");
    const storage = createTokenStorage();
    expect(await storage.getAccessToken()).toBe("stored-access");
    expect(await storage.getRefreshToken()).toBe("stored-refresh");
  });

  it("clearTokens removes memory and Preferences keys", async () => {
    const storage = createTokenStorage();
    await storage.setTokenPair("a", "r");
    await storage.clearTokens();
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
    expect(preferenceStore.has(ACCESS_TOKEN_STORAGE_KEY)).toBe(false);
    expect(preferenceStore.has(REFRESH_TOKEN_STORAGE_KEY)).toBe(false);
  });

  it("retains in-memory tokens when Preferences.set fails", async () => {
    const { Preferences } = await import("@capacitor/preferences");
    vi.mocked(Preferences.set).mockRejectedValueOnce(new Error("persist failed"));
    const storage = createTokenStorage();
    await storage.setAccessToken("mem-only");
    expect(await storage.getAccessToken()).toBe("mem-only");
  });
});
