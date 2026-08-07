import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_05_SHADOW_CHIP_KEYS = [
  'physicalActivityLevel',
  'domesticComfort',
] as const;

export type Expansion05ShadowChipKey =
  (typeof EXPANSION_05_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion05ShadowChipKey,
  string
> = {
  physicalActivityLevel: 'Activity level match',
  domesticComfort: 'Home/out balance',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion05ShadowChipKey, string> = {
  physicalActivityLevel: 'lifestyle',
  domesticComfort: 'lifestyle',
};

export function isExpansion05ShadowChipKey(
  key: string,
): key is Expansion05ShadowChipKey {
  return (EXPANSION_05_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

export function buildExpansion05ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of EXPANSION_05_SHADOW_CHIP_KEYS) {
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
