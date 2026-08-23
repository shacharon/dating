/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/use-online-status", () => ({
  useOnlineStatus: vi.fn(() => true),
}));

import { useOnlineStatus } from "@/lib/use-online-status";
import { OfflineBanner } from "@/components/offline-banner";

describe("OfflineBanner", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when online", () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows offline message with status role when offline", () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner.getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByText(/You're offline\. Some features may be unavailable/),
    ).toBeTruthy();
  });
});
