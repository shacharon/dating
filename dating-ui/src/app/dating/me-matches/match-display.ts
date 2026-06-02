import type { MeMatchDetailDto, MeMatchItemDto } from '@/lib/me-profile-api';

function matchMetaParts(
  gender: string | null,
  ageYears: number | null,
  locationLabel: string | null,
): string[] {
  return [
    gender,
    ageYears != null ? `${ageYears}y` : null,
    locationLabel,
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
    return meta || m.locationLabel;
  }
  return m.locationLabel;
}
