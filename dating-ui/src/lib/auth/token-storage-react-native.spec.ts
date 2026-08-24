/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPlatformOverrideForTests } from "@/lib/platform/platform";
import {
  resetReactNativeTokenStorageForTests,
} from "@/lib/auth/token-storage-react-native";
import { createTokenStorage } from "@/lib/auth/token-storage";

describe("token-storage (react-native stub)", () => {
  beforeEach(() => {
    setPlatformOverrideForTests("react-native");
    resetReactNativeTokenStorageForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    setPlatformOverrideForTests(null);
    vi.restoreAllMocks();
  });

  it("reads null for tokens", async () => {
    const storage = createTokenStorage();
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
  });

  it("setTokenPair is a no-op and does not throw", async () => {
    const storage = createTokenStorage();
    await expect(storage.setTokenPair("a", "r")).resolves.toBeUndefined();
    expect(await storage.getAccessToken()).toBeNull();
  });

  it("clearTokens does not throw", async () => {
    const storage = createTokenStorage();
    await expect(storage.clearTokens()).resolves.toBeUndefined();
  });

  it("warns once on first write in non-production", async () => {
    const storage = createTokenStorage();
    await storage.setAccessToken("token");
    await storage.setRefreshToken("token2");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
