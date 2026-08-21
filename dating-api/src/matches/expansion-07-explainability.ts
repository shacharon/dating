/**
 * Expansion-07 shadow positive chips (display-only until promote).
 * Standalone signal chips + pair-level support chips via synthetic breakdown rows.
 * Interest-overlap tag picker for distinct UI chips (outside the positive-chip picker).
 */
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import {
  buildStandardShadowBreakdown,
  syntheticPairEntry as makeSyntheticPairEntry,
} from './expansion-shadow-breakdown';

/** Standalone chips (pairScore from real signals). */
export const EXPANSION_07_STANDALONE_CHIP_KEYS = [
  'casualIntimacyIntent',
  'supportExchangeOrientation',
  'religiousObservance',
] as const;

/**
 * Virtual keys for pair-level chips only (NOT extraction / EnrichedSignals keys).
 * Injected as synthetic BreakdownEntry rows when pair predicates match.
 */
export const EXPANSION_07_PAIR_CHIP_KEYS = [
  'supportFinancialAlignment',
  'supportNonTransactional',
] as const;

export const EXPANSION_07_SHADOW_CHIP_KEYS = [
  ...EXPANSION_07_STANDALONE_CHIP_KEYS,
  ...EXPANSION_07_PAIR_CHIP_KEYS,
] as const;

export type Expansion07ShadowChipKey =
  (typeof EXPANSION_07_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion07ShadowChipKey,
  string
> = {
  casualIntimacyIntent: 'Intimacy expectations',
  supportExchangeOrientation: 'Support & arrangement style',
  religiousObservance: 'Religious practice',
  supportFinancialAlignment: 'Financial support alignment',
  supportNonTransactional: 'Non-transactional match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion07ShadowChipKey, string> = {
  casualIntimacyIntent: 'intimacy',
  supportExchangeOrientation: 'relationship',
  religiousObservance: 'values',
  supportFinancialAlignment: 'relationship',
  supportNonTransactional: 'relationship',
};

/** Preferred interest tags for overlap chips (i18n coverage). */
export const INTEREST_OVERLAP_CHIP_PREFERRED_TAGS = [
  'books',
  'travel',
  'hiking',
  'movies',
  'cooking',
  'music',
  'gym',
  'beach',
  'biking',
  'camping',
  'nature',
] as const;

const PREFERRED_TAG_SET = new Set<string>(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS);

export function isExpansion07ShadowChipKey(
  key: string,
): key is Expansion07ShadowChipKey {
  return (EXPANSION_07_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion07ShadowChipKey): BreakdownEntry {
  return makeSyntheticPairEntry(key);
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const aEx = finiteOrNull(signalsA.supportExchangeOrientation);
  const bEx = finiteOrNull(signalsB.supportExchangeOrientation);
  if (aEx == null || bEx == null) return [];

  // Non-transactional alignment
  if (aEx <= 3 && bEx <= 3) {
    return [syntheticPairEntry('supportNonTransactional')];
  }

  // Provider ↔ recipient alignment (only when both open to exchange)
  if (aEx < 7 || bEx < 7) return [];

  const aProv = finiteOrNull(signalsA.supportProviderOrientation);
  const bProv = finiteOrNull(signalsB.supportProviderOrientation);
  const aRec = finiteOrNull(signalsA.supportRecipientOrientation);
  const bRec = finiteOrNull(signalsB.supportRecipientOrientation);
  if (aProv == null || bProv == null || aRec == null || bRec == null) {
    return [];
  }

  const aligned =
    (aProv >= 7 && bRec >= 7) || (bProv >= 7 && aRec >= 7);
  if (!aligned) return [];

  return [syntheticPairEntry('supportFinancialAlignment')];
}

export function buildExpansion07ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [
    ...buildStandardShadowBreakdown(
      EXPANSION_07_STANDALONE_CHIP_KEYS,
      signalsA,
      signalsB,
    ),
    ...buildPairChipEntries(signalsA, signalsB),
  ];
  return out;
}

function normTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Pick up to 2 shared interest tags for overlap chips.
 * Preferred tags first (stable order of `shared`), then remaining shared tags.
 */
export function pickInterestOverlapTags(shared: string[]): string[] {
  if (shared.length === 0) return [];

  const normalizedInOrder: string[] = [];
  const seen = new Set<string>();
  for (const raw of shared) {
    const n = normTag(raw);
    if (n.length === 0 || seen.has(n)) continue;
    seen.add(n);
    normalizedInOrder.push(n);
  }

  const preferred: string[] = [];
  const rest: string[] = [];
  for (const n of normalizedInOrder) {
    if (PREFERRED_TAG_SET.has(n)) preferred.push(n);
    else rest.push(n);
  }

  return [...preferred, ...rest].slice(0, 2);
}
