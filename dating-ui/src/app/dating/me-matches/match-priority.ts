import type { MeMatchItemDto } from '@/lib/me-matches-api';

export type MatchPriorityTier = 'HIGH' | 'GOOD' | 'OTHER';

const PRIORITY_HIGH_MIN = 85;
const PRIORITY_GOOD_MIN = 70;

/** Derive tier when API field absent (tests / older payloads). */
export function resolvePriorityTier(m: MeMatchItemDto): MatchPriorityTier {
  if (m.priorityTier === 'HIGH' || m.priorityTier === 'GOOD' || m.priorityTier === 'OTHER') {
    return m.priorityTier;
  }
  const score = m.priorityScore ?? m.matchScore;
  if (score == null || !Number.isFinite(score)) return 'OTHER';
  if (score >= PRIORITY_HIGH_MIN) return 'HIGH';
  if (score >= PRIORITY_GOOD_MIN) return 'GOOD';
  return 'OTHER';
}

export type GroupedPriorityMatches = {
  high: MeMatchItemDto[];
  good: MeMatchItemDto[];
  other: MeMatchItemDto[];
  blocked: MeMatchItemDto[];
};

export function groupMatchesByPriority(
  matches: MeMatchItemDto[],
): GroupedPriorityMatches {
  const high: MeMatchItemDto[] = [];
  const good: MeMatchItemDto[] = [];
  const other: MeMatchItemDto[] = [];
  const blocked: MeMatchItemDto[] = [];

  for (const m of matches) {
    if (m.hardBlocked) {
      blocked.push(m);
      continue;
    }
    const tier = resolvePriorityTier(m);
    if (tier === 'HIGH') high.push(m);
    else if (tier === 'GOOD') good.push(m);
    else other.push(m);
  }

  return { high, good, other, blocked };
}
