/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useAppLocale, writeStoredLocale } from "@/lib/i18n";
import { heCopy } from "@/lib/i18n/he";

function LocaleProbe() {
  const { copy } = useAppLocale();
  return <span data-testid="locale-probe">{copy.nav.home}</span>;
}

describe("useAppLocale", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("returns updated copy when locale changes", async () => {
    render(<LocaleProbe />);

    expect(screen.getByTestId("locale-probe").textContent).toBe("Home");

    writeStoredLocale("he");

    await waitFor(() => {
      expect(screen.getByTestId("locale-probe").textContent).toBe(
        heCopy.nav.home,
      );
    });
  });
});
