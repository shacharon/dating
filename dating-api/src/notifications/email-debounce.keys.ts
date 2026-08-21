/**
 * Sprint 49 Story 2 — Redis new-message email debounce keys.
 * Values are `{ at: ISO }` only (no email/name). Keys hold opaque ids.
 * Keep Redis private (VPC / ElastiCache); do not expose REDIS_URL publicly.
 */

export function emailMsgDebounceKey(
  conversationId: string,
  recipientUserId: string,
): string {
  return `email:msgdebounce:${conversationId}:${recipientUserId}`;
}

/** TTL seconds from debounce minutes; floor 60s. */
export function emailMsgDebounceTtlSeconds(debounceMinutes: number): number {
  const mins =
    Number.isFinite(debounceMinutes) && debounceMinutes > 0
      ? debounceMinutes
      : 15;
  return Math.max(60, Math.floor(mins * 60));
}
