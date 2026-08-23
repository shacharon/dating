/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  MobileApiUrlMissingError,
  apiUrl,
  getApiBase,
  resolvePublicApiOrigin,
} from "./api-base";
import { setPlatformOverrideForTests } from "./platform";

describe("getApiBase / resolvePublicApiOrigin", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalInternal = process.env.INTERNAL_API_URL;

  afterEach(() => {
    setPlatformOverrideForTests(null);
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalInternal === undefined) {
      delete process.env.INTERNAL_API_URL;
    } else {
      process.env.INTERNAL_API_URL = originalInternal;
    }
  });

  it("returns empty string for web browser when env is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getApiBase()).toBe("");
    expect(resolvePublicApiOrigin()).toBe("");
  });

  it("uses NEXT_PUBLIC_API_URL when set", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
    expect(getApiBase()).toBe("https://api.example.com");
    expect(resolvePublicApiOrigin()).toBe("https://api.example.com");
  });

  it("throws MobileApiUrlMissingError for Capacitor when env is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    setPlatformOverrideForTests("capacitor");
    expect(() => getApiBase()).toThrow(MobileApiUrlMissingError);
    expect(() => resolvePublicApiOrigin()).toThrow(MobileApiUrlMissingError);
  });

  it("throws MobileApiUrlMissingError for React Native when env is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    setPlatformOverrideForTests("react-native");
    expect(() => getApiBase()).toThrow(MobileApiUrlMissingError);
  });

  it("returns explicit URL for mobile when env is set", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://10.0.2.2:3001";
    setPlatformOverrideForTests("capacitor");
    expect(getApiBase()).toBe("http://10.0.2.2:3001");
  });

  it("apiUrl uses same-origin path when web base is empty", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(apiUrl("/api/v1/auth/me")).toBe("/api/v1/auth/me");
  });

  it("apiUrl prefixes explicit base", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    expect(apiUrl("/api/v1/auth/me")).toBe("http://api.test/api/v1/auth/me");
  });
});

describe("getApiBase SSR", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalInternal = process.env.INTERNAL_API_URL;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalInternal === undefined) {
      delete process.env.INTERNAL_API_URL;
    } else {
      process.env.INTERNAL_API_URL = originalInternal;
    }
  });

  it("falls back to INTERNAL_API_URL on the server", () => {
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.INTERNAL_API_URL = "http://127.0.0.1:4000";
    expect(getApiBase()).toBe("http://127.0.0.1:4000");
  });

  it("resolvePublicApiOrigin uses default server URL when window is undefined", () => {
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.INTERNAL_API_URL;
    expect(resolvePublicApiOrigin()).toBe("http://127.0.0.1:3001");
  });
});
