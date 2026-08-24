import type { MeMatchDetailDto, MeMatchItemDto, TeaserMode } from '@/lib/api/me-matches-api';
import { formatSharedInterestNote } from '@/lib/matches/enrichment-display-v1';

/** QA preview override — client display only (Sprint 44 Story 3). */
export const TEASER_MODE_PREVIEW_STORAGE_KEY = 'dating.teaserModePreview';

function usableLocationLabel(locationLabel: string | null): string | null {
  const trimmed = locationLabel?.trim() ?? '';
  // Hide empty / junk single-character labels (e.g. stray "e").
  if (trimmed.length <= 1) return null;
  return trimmed;
}

/** Plain age for browse overlay (e.g. "32"), not list meta "32y". */
export function formatBrowseAge(ageYears: number | null): string | null {
  if (ageYears == null || !Number.isFinite(ageYears)) return null;
  return String(Math.trunc(ageYears));
}

export function matchBrowseLocation(m: MeMatchItemDto): string | null {
  return usableLocationLabel(m.locationLabel);
}

/**
 * One-liner under browse photo: takeaway → shared interests → first positive chip.
 * Kept for non–Mode-A interim and Why helpers.
 */
export function matchBrowseOneLiner(m: MeMatchItemDto): string | null {
  const takeaway = m.recommendation?.primaryTakeaway?.trim();
  if (takeaway) return takeaway;

  const shared = formatSharedInterestNote(m.explainability?.sharedInterestNote);
  if (shared) return shared;

  const chip = m.explainability?.positiveChips?.[0]?.trim();
  if (chip) return chip;

  return null;
}

/** Read QA teaser-mode preview from localStorage (null when unset / SSR). */
export function readTeaserModePreview(): TeaserMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TEASER_MODE_PREVIEW_STORAGE_KEY);
    if (
      raw === 'ready_again' ||
      raw === 'new_chapter' ||
      raw === 'first_chapter'
    ) {
      return raw;
    }
  } catch {
    // ignore quota / privacy errors
  }
  return null;
}

/** Effective browse teaser mode (preview override wins). */
export function resolveBrowseTeaserMode(m: MeMatchItemDto): TeaserMode {
  const preview = readTeaserModePreview();
  if (
    preview === 'ready_again' ||
    preview === 'new_chapter' ||
    preview === 'first_chapter'
  ) {
    return preview;
  }
  return m.teaser?.mode ?? 'first_chapter';
}

/**
 * Mode A always-visible hook. Never invent facts — API teaser or i18n empty only.
 */
export function resolveMatchBrowseHook(
  m: MeMatchItemDto,
  hookEmpty: string,
): string {
  const mode = resolveBrowseTeaserMode(m);
  if (mode !== 'first_chapter') {
    return matchBrowseOneLiner(m) ?? hookEmpty;
  }
  const line = m.teaser?.lines?.[0]?.trim();
  if (line) return line;
  return hookEmpty;
}

/**
 * Mode B life-goal claim. Prefer teaser.claim only — no hobby/takeaway fallback.
 */
export function resolveMatchBrowseClaim(
  m: MeMatchItemDto,
  claimEmpty: string,
): string {
  const claim = m.teaser?.claim?.trim();
  if (claim) {
    const stripped = claim.replace(/^["“]+|["”]+$/g, '').trim();
    return stripped || claimEmpty;
  }
  return claimEmpty;
}

export type BrowseHybridLines = { line1: string; line2: string | null };

/**
 * Mode C hybrid teaser lines. Prefer teaser.lines only — no hook/claim/takeaway invent.
 */
export function resolveMatchBrowseHybridLines(
  m: MeMatchItemDto,
  linesEmpty: string,
): BrowseHybridLines {
  const lines = m.teaser?.lines ?? [];
  const line1 = lines[0]?.trim() ?? '';
  const line2 = lines[1]?.trim() || null;
  if (!line1) {
    return { line1: linesEmpty, line2: null };
  }
  return { line1, line2 };
}

export function matchBrowseWhyBody(m: MeMatchItemDto): string | null {
  const takeaway = m.recommendation?.primaryTakeaway?.trim();
  if (takeaway) return takeaway;
  const reason = m.explainability?.reasonShort?.trim();
  if (reason) return reason;
  return null;
}

function matchMetaParts(
  gender: string | null,
  ageYears: number | null,
  locationLabel: string | null,
): string[] {
  return [
    gender,
    ageYears != null ? `${ageYears}y` : null,
    usableLocationLabel(locationLabel),
  ].filter((part): part is string => Boolean(part));
}

export function matchListPrimaryLabel(m: MeMatchItemDto): string {
  const nickname = m.nickname?.trim();
  if (nickname) return nickname;
  return matchMetaParts(m.gender, m.ageYears, m.locationLabel).join(' · ');
}

export function matchListSecondaryMeta(m: MeMatchItemDto): string | null {
  if (!m.nickname?.trim()) return null;
  const meta = matchMetaParts(m.gender, m.ageYears, m.locationLabel).join(' · ');
  return meta || null;
}

export function matchDetailTitle(m: MeMatchDetailDto): string {
  const nickname = m.nickname?.trim();
  if (nickname) return nickname;
  return [
    m.gender,
    m.ageYears != null ? `${m.ageYears} years old` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

export function matchDetailSubtitle(m: MeMatchDetailDto): string | null {
  if (m.nickname?.trim()) {
    const meta = matchMetaParts(m.gender, m.ageYears, m.locationLabel).join(' · ');
    return meta || null;
  }
  return usableLocationLabel(m.locationLabel);
}
