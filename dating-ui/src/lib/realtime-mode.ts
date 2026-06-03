export type RealtimeMode = 'ws' | 'poll';

/**
 * Sprint 4: `ws` uses socket.io push; `poll` keeps Sprint 3 interval polling.
 * Defaults to `poll` when unset or invalid (safe rollback).
 */
export function getRealtimeMode(): RealtimeMode {
  const raw = process.env.NEXT_PUBLIC_REALTIME?.trim().toLowerCase();
  if (raw === 'ws') {
    return 'ws';
  }
  return 'poll';
}
