import type { MeMatchDetailDto, MeMatchItemDto } from '@/lib/me-matches-api';

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
 * One-liner under browse photo: WHY TLDR from match narrative only.
 */
export function matchBrowseOneLiner(m: MeMatchItemDto): string | null {
  const why = m.whyTldr?.trim();
  if (why) return why;
  return null;
}

export function matchBrowseWhyBody(m: MeMatchItemDto): string | null {
  const why = m.whyTldr?.trim();
  if (why) return why;
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
