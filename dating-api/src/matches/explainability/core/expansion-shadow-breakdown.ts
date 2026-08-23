import type { BreakdownEntry } from '../../../compatibility/compatibility-score';
import { computePairScore } from '../../../compatibility/compatibility-score';

/**
 * Standard expansion shadow breakdown: dual finite signals → gap + computePairScore.
 * Used by expansion-01..06 and expansion-10 (Sprint 60 Story 3).
 */
export function buildStandardShadowBreakdown(
  keys: readonly string[],
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of keys) {
    const self = signalsA[key];
    const partner = signalsB[key];
    if (self == null || partner == null) continue;
    if (!Number.isFinite(self) || !Number.isFinite(partner)) continue;
    const gap = Math.abs(self - partner);
    out.push({
      key,
      self,
      partner,
      gap,
      pairScore: computePairScore(self, partner),
    });
  }
  return out;
}

export function isShadowChipKeyIn(
  keys: readonly string[],
  key: string,
): boolean {
  return (keys as readonly string[]).includes(key);
}

/** Synthetic pair chip row used by custom expansions (07, 11–15). */
export function syntheticPairEntry(key: string): BreakdownEntry {
  return {
    key,
    self: 9,
    partner: 9,
    gap: 0,
    pairScore: 10,
  };
}
