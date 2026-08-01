/** sessionStorage helpers for match-list scroll restore (Sprint 33 Story 3). */

export const MATCHES_SCROLL_Y_KEY = 'dating.ui.meMatches.scrollY';
export const MATCHES_SCROLL_RESTORE_KEY = 'dating.ui.meMatches.restore';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Call when navigating from list → match detail. */
export function markMatchesScrollForRestore(
  scrollY: number = typeof window !== 'undefined' ? window.scrollY : 0,
): void {
  const s = storage();
  if (!s) return;
  s.setItem(MATCHES_SCROLL_Y_KEY, String(Math.round(scrollY)));
  s.setItem(MATCHES_SCROLL_RESTORE_KEY, '1');
}

/**
 * If restore flag is set, return saved Y and clear state.
 * If flag absent, clear any stale keys and return null (fresh visit).
 */
export function consumeMatchesScrollRestore(): number | null {
  const s = storage();
  if (!s) return null;

  const shouldRestore = s.getItem(MATCHES_SCROLL_RESTORE_KEY) === '1';
  if (!shouldRestore) {
    clearMatchesScrollState();
    return null;
  }

  const raw = s.getItem(MATCHES_SCROLL_Y_KEY);
  clearMatchesScrollState();

  if (raw == null || raw === '') return null;
  const y = Number.parseInt(raw, 10);
  if (!Number.isFinite(y) || y < 0) return null;
  return y;
}

export function clearMatchesScrollState(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(MATCHES_SCROLL_Y_KEY);
  s.removeItem(MATCHES_SCROLL_RESTORE_KEY);
}

/** Apply restored Y to window; clamps to document scroll max. */
export function applyMatchesScrollY(y: number): void {
  if (typeof window === 'undefined') return;
  const maxY = Math.max(
    0,
    (document.documentElement?.scrollHeight ?? 0) - window.innerHeight,
  );
  window.scrollTo(0, Math.min(y, maxY));
}
