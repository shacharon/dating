/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectPlatform,
  isCapacitor,
  isMobile,
  isReactNative,
  isWeb,
  setPlatformOverrideForTests,
} from "./platform";

describe("platform", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PLATFORM;

  beforeEach(() => {
    setPlatformOverrideForTests(null);
    delete process.env.NEXT_PUBLIC_PLATFORM;
  });

  afterEach(() => {
    setPlatformOverrideForTests(null);
    process.env.NEXT_PUBLIC_PLATFORM = originalEnv;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns web in jsdom by default", () => {
    expect(detectPlatform()).toBe("web");
    expect(isWeb()).toBe(true);
    expect(isMobile()).toBe(false);
  });

  it("honors setPlatformOverrideForTests", () => {
    setPlatformOverrideForTests("capacitor");
    expect(detectPlatform()).toBe("capacitor");
    expect(isCapacitor()).toBe(true);
    expect(isMobile()).toBe(true);
  });

  it("detects Capacitor native runtime", () => {
    vi.stubGlobal("window", {
      ...window,
      Capacitor: { isNativePlatform: () => true },
    });
    expect(detectPlatform()).toBe("capacitor");
  });

  it("treats Capacitor browser preview as web when not native", () => {
    vi.stubGlobal("window", {
      ...window,
      Capacitor: { isNativePlatform: () => false },
    });
    expect(detectPlatform()).toBe("web");
  });

  it("falls back to capacitor when Capacitor exists without isNativePlatform", () => {
    vi.stubGlobal("window", {
      ...window,
      Capacitor: {},
    });
    expect(detectPlatform()).toBe("capacitor");
  });

  it("detects React Native via navigator.product", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      product: "ReactNative",
    });
    expect(detectPlatform()).toBe("react-native");
    expect(isReactNative()).toBe(true);
  });

  it("uses NEXT_PUBLIC_PLATFORM in non-production", () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.NEXT_PUBLIC_PLATFORM = "capacitor";
    expect(detectPlatform()).toBe("capacitor");
  });

  it("ignores NEXT_PUBLIC_PLATFORM in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_PLATFORM = "capacitor";
    expect(detectPlatform()).toBe("web");
  });

  it("override takes precedence over env platform", () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.NEXT_PUBLIC_PLATFORM = "capacitor";
    setPlatformOverrideForTests("react-native");
    expect(detectPlatform()).toBe("react-native");
  });
});

describe("platform SSR", () => {
  it("returns web when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    try {
      setPlatformOverrideForTests(null);
      expect(detectPlatform()).toBe("web");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
