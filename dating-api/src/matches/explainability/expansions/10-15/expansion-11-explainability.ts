/**
 * Expansion-11 shadow positive chips (display-only until promote).
 * stressResponse: aligned direction via pairScore.
 * Both-low jealousy: synthetic pair chip (NOT high×high on jealousySecurity).
 */
import type { BreakdownEntry } from '../../../../compatibility/compatibility-score';
import {
  buildStandardShadowBreakdown,
  syntheticPairEntry as makeSyntheticPairEntry,
} from '../../core/expansion-shadow-breakdown';

/** Standalone: aligned stress direction via pairScore. */
export const EXPANSION_11_STANDALONE_CHIP_KEYS = ['stressResponse'] as const;

/**
 * Virtual key for both-low jealousy positive chip only (NOT an extraction key).
 * Injected as synthetic BreakdownEntry when both jealousySecurity <= 3.
 */
export const EXPANSION_11_PAIR_CHIP_KEYS = ['jealousySecureTrusting'] as const;

export const EXPANSION_11_SHADOW_CHIP_KEYS = [
  ...EXPANSION_11_STANDALONE_CHIP_KEYS,
  ...EXPANSION_11_PAIR_CHIP_KEYS,
] as const;

export type Expansion11ShadowChipKey =
  (typeof EXPANSION_11_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion11ShadowChipKey,
  string
> = {
  stressResponse: 'Support under pressure',
  jealousySecureTrusting: 'Secure & trusting',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion11ShadowChipKey, string> = {
  stressResponse: 'emotional',
  jealousySecureTrusting: 'emotional',
};

export function isExpansion11ShadowChipKey(
  key: string,
): key is Expansion11ShadowChipKey {
  return (EXPANSION_11_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion11ShadowChipKey): BreakdownEntry {
  return makeSyntheticPairEntry(key);
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const aJ = finiteOrNull(signalsA.jealousySecurity);
  const bJ = finiteOrNull(signalsB.jealousySecurity);
  if (aJ == null || bJ == null) return [];
  if (aJ <= 3 && bJ <= 3) {
    return [syntheticPairEntry('jealousySecureTrusting')];
  }
  return [];
}

export function buildExpansion11ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return [
    ...buildStandardShadowBreakdown(
      EXPANSION_11_STANDALONE_CHIP_KEYS,
      signalsA,
      signalsB,
    ),
    ...buildPairChipEntries(signalsA, signalsB),
  ];
}
