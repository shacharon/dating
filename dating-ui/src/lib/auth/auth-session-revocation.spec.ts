/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import {
  notifyAuthSessionRevoked,
  registerAuthSessionRevokedHandler,
  resetAuthSessionRevocationForTests,
} from "./auth-session-revocation";

describe("auth-session-revocation", () => {
  it("calls registered handler on notify", async () => {
    resetAuthSessionRevocationForTests();
    const handler = vi.fn();
    registerAuthSessionRevokedHandler(handler);
    await notifyAuthSessionRevoked();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("clears handler when registered with null", async () => {
    resetAuthSessionRevocationForTests();
    const handler = vi.fn();
    registerAuthSessionRevokedHandler(handler);
    registerAuthSessionRevokedHandler(null);
    await notifyAuthSessionRevoked();
    expect(handler).not.toHaveBeenCalled();
  });
});
