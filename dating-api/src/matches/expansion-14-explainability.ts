/**
 * Expansion-14 shadow positive chips (display-only until promote).
 * Synthetic pair chips (NOT raw pairScore on extraction keys).
 */
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { syntheticPairEntry as makeSyntheticPairEntry } from './expansion-shadow-breakdown';

/**
 * Virtual keys for Expansion-14 positive chips only (NOT extraction keys).
 * patienceMatch: both patienceTolerance >= 7
 * intimacyPaceAligned: both intimacyPacing >= 7 OR both <= 3
 * monogamyStructureAligned: both monogamyAlignment <= 2 OR both >= 7
 */
export const EXPANSION_14_PAIR_CHIP_KEYS = [
  'patienceMatch',
  'intimacyPaceAligned',
  'monogamyStructureAligned',
] as const;

export const EXPANSION_14_SHADOW_CHIP_KEYS = [
  ...EXPANSION_14_PAIR_CHIP_KEYS,
] as const;

export type Expansion14ShadowChipKey =
  (typeof EXPANSION_14_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion14ShadowChipKey,
  string
> = {
  patienceMatch: 'Patience match',
  intimacyPaceAligned: 'Pace of closeness',
  monogamyStructureAligned: 'Aligned on relationship structure',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion14ShadowChipKey, string> = {
  patienceMatch: 'relationship',
  intimacyPaceAligned: 'intimacy',
  monogamyStructureAligned: 'relationship',
};

export function isExpansion14ShadowChipKey(
  key: string,
): key is Expansion14ShadowChipKey {
  return (EXPANSION_14_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion14ShadowChipKey): BreakdownEntry {
  return makeSyntheticPairEntry(key);
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];

  const aP = finiteOrNull(signalsA.patienceTolerance);
  const bP = finiteOrNull(signalsB.patienceTolerance);
  if (aP != null && bP != null && aP >= 7 && bP >= 7) {
    out.push(syntheticPairEntry('patienceMatch'));
  }

  const aI = finiteOrNull(signalsA.intimacyPacing);
  const bI = finiteOrNull(signalsB.intimacyPacing);
  if (
    aI != null &&
    bI != null &&
    ((aI >= 7 && bI >= 7) || (aI <= 3 && bI <= 3))
  ) {
    out.push(syntheticPairEntry('intimacyPaceAligned'));
  }

  const aM = finiteOrNull(signalsA.monogamyAlignment);
  const bM = finiteOrNull(signalsB.monogamyAlignment);
  if (
    aM != null &&
    bM != null &&
    ((aM <= 2 && bM <= 2) || (aM >= 7 && bM >= 7))
  ) {
    out.push(syntheticPairEntry('monogamyStructureAligned'));
  }

  return out;
}

export function buildExpansion14ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildPairChipEntries(signalsA, signalsB);
}
