/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PushNotificationsRegistration } from "./push-notifications-registration";
import { setPlatformOverrideForTests } from "@/lib/platform/platform";

const setupCapacitorPush = vi.fn().mockResolvedValue(undefined);
const teardownCapacitorPush = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/push/capacitor-push", () => ({
  setupCapacitorPush: (...args: unknown[]) => setupCapacitorPush(...args),
  teardownCapacitorPush: (...args: unknown[]) => teardownCapacitorPush(...args),
}));

describe("PushNotificationsRegistration", () => {
  afterEach(() => {
    setPlatformOverrideForTests(null);
    vi.clearAllMocks();
  });

  it("does not setup push on web", () => {
    render(<PushNotificationsRegistration />);
    expect(setupCapacitorPush).not.toHaveBeenCalled();
  });

  it("sets up push on capacitor", () => {
    setPlatformOverrideForTests("capacitor");
    render(<PushNotificationsRegistration />);
    expect(setupCapacitorPush).toHaveBeenCalledTimes(1);
  });

  it("teardown on unmount", () => {
    setPlatformOverrideForTests("capacitor");
    const { unmount } = render(<PushNotificationsRegistration />);
    unmount();
    expect(teardownCapacitorPush).toHaveBeenCalled();
  });
});
