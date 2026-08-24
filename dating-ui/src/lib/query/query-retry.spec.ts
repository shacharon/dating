import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHttpStatusFromQueryError,
  queryRetryDelay,
  QUERY_MAX_RETRY_ATTEMPTS,
  shouldRetryQuery,
} from "./query-retry";

describe("query-retry", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getHttpStatusFromQueryError", () => {
    it("parses status from API client error messages", () => {
      expect(
        getHttpStatusFromQueryError(new Error("POST /api/v1/x failed: 401")),
      ).toBe(401);
      expect(
        getHttpStatusFromQueryError(new Error("GET /api/v1/y failed: 503")),
      ).toBe(503);
    });

    it("returns null when no status in message", () => {
      expect(getHttpStatusFromQueryError(new Error("boom"))).toBeNull();
    });
  });

  describe("shouldRetryQuery", () => {
    it("does not retry when offline", () => {
      vi.stubGlobal("navigator", { onLine: false });
      expect(shouldRetryQuery(0, new TypeError("Failed to fetch"))).toBe(false);
    });

    it("does not retry 4xx errors", () => {
      for (const status of [401, 403, 404, 422]) {
        expect(
          shouldRetryQuery(0, new Error(`GET failed: ${status}`)),
        ).toBe(false);
      }
    });

    it("retries 5xx when online", () => {
      expect(shouldRetryQuery(0, new Error("GET failed: 500"))).toBe(true);
      expect(shouldRetryQuery(1, new Error("GET failed: 502"))).toBe(true);
    });

    it("stops after max retry attempts", () => {
      expect(
        shouldRetryQuery(
          QUERY_MAX_RETRY_ATTEMPTS,
          new Error("GET failed: 500"),
        ),
      ).toBe(false);
    });

    it("retries TypeError network failures when online", () => {
      expect(shouldRetryQuery(0, new TypeError("Failed to fetch"))).toBe(true);
    });

    it("does not retry generic errors without HTTP status", () => {
      expect(shouldRetryQuery(0, new Error("unexpected"))).toBe(false);
    });
  });

  describe("queryRetryDelay", () => {
    it("uses exponential backoff capped at 30s", () => {
      expect(queryRetryDelay(0)).toBe(1000);
      expect(queryRetryDelay(1)).toBe(2000);
      expect(queryRetryDelay(2)).toBe(4000);
      expect(queryRetryDelay(10)).toBe(30_000);
    });
  });
});
