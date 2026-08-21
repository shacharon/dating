/**
 * Expansion-12 shadow positive chips (display-only until promote).
 * emotionalExpression: aligned via pairScore.
 * Both-high listening: synthetic pair chip (NOT raw listeningPresence pairScore).
 */
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import {
  buildStandardShadowBreakdown,
  syntheticPairEntry as makeSyntheticPairEntry,
} from './expansion-shadow-breakdown';

/** Standalone: aligned expression via pairScore. */
export const EXPANSION_12_STANDALONE_CHIP_KEYS = [
  'emotionalExpression',
] as const;

/**
 * Virtual key for both-high listening positive chip only (NOT an extraction key).
 * Injected as synthetic BreakdownEntry when both listeningPresence >= 7.
 */
export const EXPANSION_12_PAIR_CHIP_KEYS = ['listeningFeelsHeard'] as const;

export const EXPANSION_12_SHADOW_CHIP_KEYS = [
  ...EXPANSION_12_STANDALONE_CHIP_KEYS,
  ...EXPANSION_12_PAIR_CHIP_KEYS,
] as const;

export type Expansion12ShadowChipKey =
  (typeof EXPANSION_12_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion12ShadowChipKey,
  string
> = {
  emotionalExpression: 'Expressiveness match',
  listeningFeelsHeard: 'Feels heard',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion12ShadowChipKey, string> = {
  emotionalExpression: 'emotional',
  listeningFeelsHeard: 'communication',
};

export function isExpansion12ShadowChipKey(
  key: string,
): key is Expansion12ShadowChipKey {
  return (EXPANSION_12_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion12ShadowChipKey): BreakdownEntry {
  return makeSyntheticPairEntry(key);
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const aL = finiteOrNull(signalsA.listeningPresence);
  const bL = finiteOrNull(signalsB.listeningPresence);
  if (aL == null || bL == null) return [];
  if (aL >= 7 && bL >= 7) {
    return [syntheticPairEntry('listeningFeelsHeard')];
  }
  return [];
}

export function buildExpansion12ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return [
    ...buildStandardShadowBreakdown(
      EXPANSION_12_STANDALONE_CHIP_KEYS,
      signalsA,
      signalsB,
    ),
    ...buildPairChipEntries(signalsA, signalsB),
  ];
}
