/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "@/components/offline-banner";

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when online", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows offline message with status role when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner.getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByText(/You're offline\. Some features may be unavailable/),
    ).toBeTruthy();
  });
});
