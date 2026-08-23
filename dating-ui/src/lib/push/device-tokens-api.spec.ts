/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "./device-tokens-api";

vi.mock("@/lib/authenticated-fetch", () => ({
  authenticatedFetch: vi.fn(),
}));

import { authenticatedFetch } from "@/lib/authenticated-fetch";

const mockFetch = vi.mocked(authenticatedFetch);

describe("device-tokens-api", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("registerDeviceToken POSTs token and platform", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await registerDeviceToken(" fcm-token ", "android");

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/me/devices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token: "fcm-token", platform: "android" }),
    });
  });

  it("unregisterDeviceToken DELETEs token", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await unregisterDeviceToken(" fcm-token ");

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/me/devices", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token: "fcm-token" }),
    });
  });

  it("throws when register fails", async () => {
    mockFetch.mockResolvedValue(new Response("bad request", { status: 400 }));

    await expect(registerDeviceToken("token", "android")).rejects.toThrow(
      "bad request",
    );
  });
});
