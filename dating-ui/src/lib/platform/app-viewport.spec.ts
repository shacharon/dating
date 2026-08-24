/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { viewport } from "./app-viewport";

describe("app-viewport", () => {
  it("uses device-width and initial scale 1", () => {
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
  });

  it("uses viewport-fit cover for safe-area env vars", () => {
    expect(viewport.viewportFit).toBe("cover");
  });

  it("does not lock zoom (a11y)", () => {
    expect(viewport.maximumScale).toBeUndefined();
    expect(viewport.userScalable).toBeUndefined();
  });
});
