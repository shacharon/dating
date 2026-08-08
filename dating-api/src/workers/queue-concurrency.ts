/**
 * Bull processor concurrency per API process (Sprint 48 Story 2).
 * Env unset / non-finite / &lt; 1 → default.
 */
export const PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV =
  'PROFILE_ANALYSIS_QUEUE_CONCURRENCY';
export const PHOTO_MODERATION_QUEUE_CONCURRENCY_ENV =
  'PHOTO_MODERATION_QUEUE_CONCURRENCY';
export const QUEUE_CONCURRENCY_DEFAULT = 1;

/** Positive finite int; unset / invalid / &lt; 1 → defaultN */
export function resolveQueueConcurrency(
  envKey: string,
  defaultN: number = QUEUE_CONCURRENCY_DEFAULT,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[envKey];
  if (raw == null || String(raw).trim() === '') {
    return defaultN;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return defaultN;
  }
  return Math.floor(n);
}
