import type { MeMatchDetailDto, MeMatchItemDto } from '@/lib/me-profile-api';

function usableLocationLabel(locationLabel: string | null): string | null {
  const trimmed = locationLabel?.trim() ?? '';
  // Hide empty / junk single-character labels (e.g. stray "e").
  if (trimmed.length <= 1) return null;
  return trimmed;
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
