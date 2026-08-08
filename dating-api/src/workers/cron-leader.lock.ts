import { hostname } from 'os';

/**
 * Cross-process cron leader lock keys / TTLs (Sprint 48 Story 3).
 * Specs simulating two processes: first tryAcquireCronLock → acquired,
 * second → not_acquired (see redis-cache.service.spec.ts).
 */
export const CRON_LOCK_PHOTO_SLA = 'cron:lock:photo-sla';
export const CRON_LOCK_MUTE_EXPIRY = 'cron:lock:mute-expiry';
export const PHOTO_SLA_LOCK_TTL_SECONDS = 3300;

export function muteExpiryLockTtlSeconds(intervalMs: number): number {
  return Math.max(60, Math.floor((intervalMs / 1000) * 0.9));
}

/** Break-glass only: treat Redis unavailable as leadership acquired. Must stay unset in prod. */
export function isCronLeaderFailOpen(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.CRON_LEADER_FAIL_OPEN?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export type CronLockAcquireResult =
  | 'acquired'
  | 'not_acquired'
  | 'unavailable';

/** Whether the cron tick should run given lock result (+ optional fail-open). */
export function shouldRunCronTick(
  result: CronLockAcquireResult,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (result === 'acquired') return true;
  if (result === 'unavailable' && isCronLeaderFailOpen(env)) return true;
  return false;
}

export function cronLockDebugValue(): {
  at: string;
  pid: number;
  host: string;
} {
  return {
    at: new Date().toISOString(),
    pid: process.pid,
    host: hostname(),
  };
}
