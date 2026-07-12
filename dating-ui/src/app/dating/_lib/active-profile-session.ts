/**
 * Remembers which UserProfile the browser session is editing (no auth yet).
 * sessionStorage only — not persisted across browser restarts.
 */

const SESSION_KEY = 'dating.activeUserProfileId';

export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw && raw.trim() ? raw.trim() : null;
}

export function setActiveProfileId(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(SESSION_KEY, id);
}

export function clearActiveProfileId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(SESSION_KEY);
}
