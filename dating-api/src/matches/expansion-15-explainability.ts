/**
 * Expansion-15 shadow positive chips (display-only until promote).
 * Synthetic pair chips (NOT raw pairScore on extraction keys).
 */
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { syntheticPairEntry as makeSyntheticPairEntry } from './expansion-shadow-breakdown';

/**
 * Virtual keys for Expansion-15 positive chips only (NOT extraction keys).
 * familyStyleMatch: both familyEnmeshment >= 7 OR both <= 3
 * friendCoupleAligned: both friendCoupleBalance >= 7 OR both <= 3
 * rechargeStyleMatch: both aloneTimeNeed >= 7 OR both <= 3
 */
export const EXPANSION_15_PAIR_CHIP_KEYS = [
  'familyStyleMatch',
  'friendCoupleAligned',
  'rechargeStyleMatch',
] as const;

export const EXPANSION_15_SHADOW_CHIP_KEYS = [
  ...EXPANSION_15_PAIR_CHIP_KEYS,
] as const;

export type Expansion15ShadowChipKey =
  (typeof EXPANSION_15_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion15ShadowChipKey,
  string
> = {
  familyStyleMatch: 'Family style match',
  friendCoupleAligned: 'Friends & couple balance',
  rechargeStyleMatch: 'Recharge style match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion15ShadowChipKey, string> = {
  familyStyleMatch: 'relationship',
  friendCoupleAligned: 'social',
  rechargeStyleMatch: 'social',
};

export function isExpansion15ShadowChipKey(
  key: string,
): key is Expansion15ShadowChipKey {
  return (EXPANSION_15_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion15ShadowChipKey): BreakdownEntry {
  return makeSyntheticPairEntry(key);
}

function dualBandAligned(a: number | null, b: number | null): boolean {
  return (
    a != null && b != null && ((a >= 7 && b >= 7) || (a <= 3 && b <= 3))
  );
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];

  if (
    dualBandAligned(
      finiteOrNull(signalsA.familyEnmeshment),
      finiteOrNull(signalsB.familyEnmeshment),
    )
  ) {
    out.push(syntheticPairEntry('familyStyleMatch'));
  }

  if (
    dualBandAligned(
      finiteOrNull(signalsA.friendCoupleBalance),
      finiteOrNull(signalsB.friendCoupleBalance),
    )
  ) {
    out.push(syntheticPairEntry('friendCoupleAligned'));
  }

  if (
    dualBandAligned(
      finiteOrNull(signalsA.aloneTimeNeed),
      finiteOrNull(signalsB.aloneTimeNeed),
    )
  ) {
    out.push(syntheticPairEntry('rechargeStyleMatch'));
  }

  return out;
}

export function buildExpansion15ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildPairChipEntries(signalsA, signalsB);
}
