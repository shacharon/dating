/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRefreshScheduler, REFRESH_LEAD_MS } from "./auth-token-scheduler";

describe("auth-token-scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules refresh before JWT expiry", async () => {
    const exp = Math.floor(Date.now() / 1000) + 900;
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ exp }));
    const token = `${header}.${payload}.sig`;
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler();

    scheduler.schedule(token, onRefresh);
    expect(onRefresh).not.toHaveBeenCalled();

    const expectedDelay = 900 * 1000 - REFRESH_LEAD_MS;
    await vi.advanceTimersByTimeAsync(expectedDelay - 1);
    expect(onRefresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("clear cancels a pending refresh", async () => {
    const exp = Math.floor(Date.now() / 1000) + 900;
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ exp }));
    const token = `${header}.${payload}.sig`;
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler();

    scheduler.schedule(token, onRefresh);
    scheduler.clear();
    await vi.advanceTimersByTimeAsync(900 * 1000);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("ignores invalid JWT without throwing", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler();
    expect(() => scheduler.schedule("not-a-jwt", onRefresh)).not.toThrow();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
