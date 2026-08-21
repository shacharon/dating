/**
 * Expansion-13 shadow positive chips (display-only until promote).
 * Both-high growth / self-awareness: synthetic pair chips (NOT raw pairScore).
 */
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { syntheticPairEntry as makeSyntheticPairEntry } from './expansion-shadow-breakdown';

/**
 * Virtual keys for both-high positive chips only (NOT extraction keys).
 * Injected as synthetic BreakdownEntry when both growthMindset / selfAwareness >= 7.
 */
export const EXPANSION_13_PAIR_CHIP_KEYS = [
  'growthGrowsTogether',
  'selfAwarenessMatch',
] as const;

export const EXPANSION_13_SHADOW_CHIP_KEYS = [
  ...EXPANSION_13_PAIR_CHIP_KEYS,
] as const;

export type Expansion13ShadowChipKey =
  (typeof EXPANSION_13_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion13ShadowChipKey,
  string
> = {
  growthGrowsTogether: 'Grows together',
  selfAwarenessMatch: 'Self-awareness match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion13ShadowChipKey, string> = {
  growthGrowsTogether: 'personal',
  selfAwarenessMatch: 'personal',
};

export function isExpansion13ShadowChipKey(
  key: string,
): key is Expansion13ShadowChipKey {
  return (EXPANSION_13_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion13ShadowChipKey): BreakdownEntry {
  return makeSyntheticPairEntry(key);
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  const aG = finiteOrNull(signalsA.growthMindset);
  const bG = finiteOrNull(signalsB.growthMindset);
  if (aG != null && bG != null && aG >= 7 && bG >= 7) {
    out.push(syntheticPairEntry('growthGrowsTogether'));
  }
  const aS = finiteOrNull(signalsA.selfAwareness);
  const bS = finiteOrNull(signalsB.selfAwareness);
  if (aS != null && bS != null && aS >= 7 && bS >= 7) {
    out.push(syntheticPairEntry('selfAwarenessMatch'));
  }
  return out;
}

export function buildExpansion13ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildPairChipEntries(signalsA, signalsB);
}
