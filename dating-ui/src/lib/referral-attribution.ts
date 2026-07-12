export const REFERRAL_STORAGE_KEY = 'dating_referral_ref';

const REFERRER_ID_PATTERN = /^c[a-z0-9]{20,}$/i;
const MAX_REFERRER_ID_LENGTH = 36;

/** Client-side format check only — server re-validates on signup. */
export function isValidReferralRefFormat(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_REFERRER_ID_LENGTH &&
    REFERRER_ID_PATTERN.test(trimmed)
  );
}

export function readStoredReferralRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    return isValidReferralRefFormat(raw) ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function writeStoredReferralRef(referrerUserId: string): void {
  if (typeof window === 'undefined') return;
  if (!isValidReferralRefFormat(referrerUserId)) return;
  try {
    window.sessionStorage.setItem(REFERRAL_STORAGE_KEY, referrerUserId.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredReferralRef(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Reads `?ref=` from landing URL and persists to sessionStorage when valid.
 * Returns whether a ref was stored after this call.
 */
export function captureReferralFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): boolean {
  const raw = searchParams.get('ref');
  if (!raw || !isValidReferralRefFormat(raw)) {
    return readStoredReferralRef() != null;
  }
  writeStoredReferralRef(raw);
  return true;
}

export function buildInviteUrl(origin: string, referrerUserId: string): string {
  const base = origin.replace(/\/$/, '') || origin;
  if (!isValidReferralRefFormat(referrerUserId)) {
    return `${base}/`;
  }
  return `${base}/?ref=${encodeURIComponent(referrerUserId.trim())}`;
}
