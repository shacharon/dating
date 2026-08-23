/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLastRegisteredPushToken,
  getLastRegisteredPushToken,
  resetCapacitorPushForTests,
  setupCapacitorPush,
  teardownCapacitorPush,
} from "./capacitor-push";
import { setPlatformOverrideForTests } from "@/lib/platform";

const addListener = vi.fn();
const requestPermissions = vi.fn();
const register = vi.fn();

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener,
    requestPermissions,
    register,
  },
}));

describe("capacitor-push", () => {
  beforeEach(() => {
    resetCapacitorPushForTests();
    setPlatformOverrideForTests(null);
    addListener.mockImplementation(async (_event: string, cb: (payload: unknown) => void) => {
      if (_event === "registration") {
        registrationCallback = cb;
      }
      return { remove: vi.fn().mockResolvedValue(undefined) };
    });
    requestPermissions.mockResolvedValue({ receive: "granted" });
    register.mockResolvedValue(undefined);
  });

  let registrationCallback: ((payload: unknown) => void) | null = null;

  afterEach(() => {
    setPlatformOverrideForTests(null);
    resetCapacitorPushForTests();
    vi.clearAllMocks();
    registrationCallback = null;
  });

  it("no-ops on web", async () => {
    await setupCapacitorPush({
      onRegistration: vi.fn(),
    });

    expect(addListener).not.toHaveBeenCalled();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("requests permission and registers on capacitor", async () => {
    setPlatformOverrideForTests("capacitor");
    const onRegistration = vi.fn();

    await setupCapacitorPush({ onRegistration });

    expect(addListener).toHaveBeenCalled();
    expect(requestPermissions).toHaveBeenCalled();
    expect(register).toHaveBeenCalled();

    registrationCallback?.({ value: "device-token-123" });
    expect(getLastRegisteredPushToken()).toBe("device-token-123");
    expect(onRegistration).toHaveBeenCalledWith("device-token-123");
  });

  it("skips register when permission denied", async () => {
    setPlatformOverrideForTests("capacitor");
    requestPermissions.mockResolvedValue({ receive: "denied" });

    await setupCapacitorPush({ onRegistration: vi.fn() });

    expect(register).not.toHaveBeenCalled();
  });

  it("clears last token helper", () => {
    resetCapacitorPushForTests();
    clearLastRegisteredPushToken();
    expect(getLastRegisteredPushToken()).toBeNull();
  });

  it("teardown removes listeners", async () => {
    setPlatformOverrideForTests("capacitor");
    const remove = vi.fn().mockResolvedValue(undefined);
    addListener.mockResolvedValue({ remove });

    await setupCapacitorPush({ onRegistration: vi.fn() });
    await teardownCapacitorPush();

    expect(remove).toHaveBeenCalled();
  });
});
