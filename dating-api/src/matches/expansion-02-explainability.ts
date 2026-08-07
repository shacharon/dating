import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_02_SHADOW_CHIP_KEYS = [
  'emotionalRegulation',
  'physicalAffectionStyle',
] as const;

export type Expansion02ShadowChipKey =
  (typeof EXPANSION_02_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion02ShadowChipKey,
  string
> = {
  emotionalRegulation: 'Emotional balance',
  physicalAffectionStyle: 'Affection rhythm match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion02ShadowChipKey, string> = {
  emotionalRegulation: 'emotional',
  physicalAffectionStyle: 'intimacy',
};

export function isExpansion02ShadowChipKey(
  key: string,
): key is Expansion02ShadowChipKey {
  return (EXPANSION_02_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

export function buildExpansion02ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of EXPANSION_02_SHADOW_CHIP_KEYS) {
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
