import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_01_SHADOW_CHIP_KEYS = [
  'empathyCompassion',
  'vulnerabilityOpenness',
] as const;

export type Expansion01ShadowChipKey =
  (typeof EXPANSION_01_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion01ShadowChipKey,
  string
> = {
  empathyCompassion: 'Understanding & care',
  vulnerabilityOpenness: 'Authentic openness',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion01ShadowChipKey, string> = {
  empathyCompassion: 'emotional',
  vulnerabilityOpenness: 'emotional',
};

export function isExpansion01ShadowChipKey(
  key: string,
): key is Expansion01ShadowChipKey {
  return (EXPANSION_01_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

export function buildExpansion01ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of EXPANSION_01_SHADOW_CHIP_KEYS) {
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
