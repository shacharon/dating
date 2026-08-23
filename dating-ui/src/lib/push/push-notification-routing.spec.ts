/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { resolvePushNotificationPath } from "./push-notification-routing";

describe("resolvePushNotificationPath", () => {
  it("routes new_message to conversation detail", () => {
    expect(
      resolvePushNotificationPath({
        type: "new_message",
        conversationId: "c1",
      }),
    ).toBe("/dating/conversations/c1");
  });

  it("routes mutual_match to match detail", () => {
    expect(
      resolvePushNotificationPath({
        type: "mutual_match",
        conversationId: "m1",
      }),
    ).toBe("/dating/me-matches/m1");
  });

  it("falls back to conversations list when data is missing", () => {
    expect(resolvePushNotificationPath(undefined)).toBe("/dating/conversations");
    expect(resolvePushNotificationPath({})).toBe("/dating/conversations");
    expect(
      resolvePushNotificationPath({ type: "new_message", conversationId: "  " }),
    ).toBe("/dating/conversations");
  });

  it("falls back for unknown notification types", () => {
    expect(
      resolvePushNotificationPath({
        type: "other",
        conversationId: "x1",
      }),
    ).toBe("/dating/conversations");
  });

  it("encodes ids in paths", () => {
    expect(
      resolvePushNotificationPath({
        type: "new_message",
        conversationId: "a/b",
      }),
    ).toBe("/dating/conversations/a%2Fb");
  });

  it("keeps traversal segments inside a single dynamic route param", () => {
    expect(
      resolvePushNotificationPath({
        type: "new_message",
        conversationId: "../../../evil",
      }),
    ).toBe("/dating/conversations/..%2F..%2F..%2Fevil");
  });
});
