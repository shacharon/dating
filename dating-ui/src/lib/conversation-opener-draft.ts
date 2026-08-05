/** Session handoff for browse “Like & use opener” → mutual → conversation prefill. */

export const OPENER_DRAFT_STORAGE_KEY = 'dating.openerDraft';

/** Soft TTL — ignore drafts older than 30 minutes. */
export const OPENER_DRAFT_TTL_MS = 30 * 60 * 1000;

export type OpenerDraftPayload = {
  matchProfileId: string;
  opener: string;
  savedAt: number;
};

function canUseStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

export function saveOpenerDraft(payload: OpenerDraftPayload): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(OPENER_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function readOpenerDraft(): OpenerDraftPayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(OPENER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenerDraftPayload>;
    if (
      typeof parsed.matchProfileId !== 'string' ||
      typeof parsed.opener !== 'string' ||
      typeof parsed.savedAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > OPENER_DRAFT_TTL_MS) {
      clearOpenerDraft();
      return null;
    }
    const opener = parsed.opener.trim();
    if (!opener || !parsed.matchProfileId.trim()) return null;
    return {
      matchProfileId: parsed.matchProfileId.trim(),
      opener,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearOpenerDraft(): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(OPENER_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Build conversation URL with optional starter query (encodeURIComponent). */
export function conversationUrlWithStarter(
  conversationId: string,
  opener: string | null | undefined,
): string {
  const base = `/dating/conversations/${conversationId}`;
  const trimmed = opener?.trim();
  if (!trimmed) return base;
  return `${base}?starter=${encodeURIComponent(trimmed)}`;
}

/**
 * Value from `URLSearchParams.get('starter')` — already decoded by the router.
 * Do not call decodeURIComponent again (breaks openers that contain `%`).
 */
export function starterFromSearchParam(
  raw: string | null | undefined,
): string {
  return raw?.trim() ?? '';
}
