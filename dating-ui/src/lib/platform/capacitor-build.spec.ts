/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { isCapacitorBuild } from "./capacitor-build";

describe("isCapacitorBuild", () => {
  const previous = process.env.CAPACITOR_BUILD;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.CAPACITOR_BUILD;
    } else {
      process.env.CAPACITOR_BUILD = previous;
    }
  });

  it("returns true when CAPACITOR_BUILD=1", () => {
    process.env.CAPACITOR_BUILD = "1";
    expect(isCapacitorBuild()).toBe(true);
  });

  it("returns false when unset or other values", () => {
    delete process.env.CAPACITOR_BUILD;
    expect(isCapacitorBuild()).toBe(false);

    process.env.CAPACITOR_BUILD = "0";
    expect(isCapacitorBuild()).toBe(false);
  });
});
