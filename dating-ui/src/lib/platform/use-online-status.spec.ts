/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readNavigatorOnline, useOnlineStatus } from "./use-online-status";

describe("readNavigatorOnline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(readNavigatorOnline()).toBe(true);
  });

  it("reflects navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(readNavigatorOnline()).toBe(false);
  });
});

describe("useOnlineStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts from navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("updates on window offline and online events", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      vi.stubGlobal("navigator", { onLine: false });
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.stubGlobal("navigator", { onLine: true });
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
