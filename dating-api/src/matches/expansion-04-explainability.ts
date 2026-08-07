import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_04_SHADOW_CHIP_KEYS = [
  'intellectualCuriosity',
  'creativeExpression',
] as const;

export type Expansion04ShadowChipKey =
  (typeof EXPANSION_04_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion04ShadowChipKey,
  string
> = {
  intellectualCuriosity: 'Mental stimulation',
  creativeExpression: 'Creative expression',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion04ShadowChipKey, string> = {
  intellectualCuriosity: 'intellectual',
  creativeExpression: 'creative',
};

export function isExpansion04ShadowChipKey(
  key: string,
): key is Expansion04ShadowChipKey {
  return (EXPANSION_04_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

export function buildExpansion04ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of EXPANSION_04_SHADOW_CHIP_KEYS) {
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
