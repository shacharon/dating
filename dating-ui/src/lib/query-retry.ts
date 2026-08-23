/** Max retry attempts after the initial failure (2 → 3 total tries). */
export const QUERY_MAX_RETRY_ATTEMPTS = 2;

/** Parse HTTP status embedded in API client Error messages. */
export function getHttpStatusFromQueryError(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/\bfailed:\s*(\d{3})\b/i);
  return match ? Number(match[1]) : null;
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return error instanceof TypeError;
}

/** TanStack Query v5 retry callback. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }
  const status = getHttpStatusFromQueryError(error);
  if (status != null) {
    if (status >= 400 && status < 500) return false;
  }
  if (failureCount >= QUERY_MAX_RETRY_ATTEMPTS) return false;
  if (status != null && status >= 500) return true;
  if (isLikelyNetworkError(error)) return true;
  return false;
}

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}
