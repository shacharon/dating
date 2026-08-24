export type RealtimeMode = 'ws' | 'poll';

/**
 * `ws` = socket.io push; `poll` = Sprint 3 interval.
 * Default `ws` when unset (Sprint 29). Set `NEXT_PUBLIC_REALTIME=poll` to force poll / emergency rollback.
 */
export function getRealtimeMode(): RealtimeMode {
  const raw = process.env.NEXT_PUBLIC_REALTIME?.trim().toLowerCase();
  if (raw === 'poll') {
    return 'poll';
  }
  if (raw === 'ws' || raw === 'websocket' || raw == null || raw === '') {
    return 'ws';
  }
  // Unknown non-empty value → poll (safe explicit rollback / typo escape hatch)
  return 'poll';
}
