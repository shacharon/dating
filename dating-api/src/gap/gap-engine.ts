import { EXTRACTION_SIGNAL_KEYS } from '../extraction/extracted-signals.interface';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';

export interface GapEngineResult {
  selfVsPartner: Record<string, number>;
  selfVsRelationship: Record<string, number>;
  partnerVsRelationship: Record<string, number>;
  highTensionSignals: string[];
  strongAlignmentSignals: string[];
}

const HIGH_TENSION_THRESHOLD = 6;
const STRONG_ALIGNMENT_THRESHOLD = 2;

/**
 * Compute gap between two signal maps: for each key where both values are non-null, gap = abs(a - b).
 * Keys with null in either map are omitted.
 */
function gapBetween(
  a: Record<string, number | null>,
  b: Record<string, number | null>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of EXTRACTION_SIGNAL_KEYS) {
    const va = a[key];
    const vb = b[key];
    if (va != null && vb != null) {
      out[key] = Math.abs(va - vb);
    }
  }
  return out;
}

/**
 * Collect signal names where gap >= 6 in any of the three comparison maps.
 * No duplicates, no nulls.
 */
function collectHighTension(
  selfVsPartner: Record<string, number>,
  selfVsRelationship: Record<string, number>,
  partnerVsRelationship: Record<string, number>,
): string[] {
  const set = new Set<string>();
  for (const [signal, g] of Object.entries(selfVsPartner)) {
    if (g >= HIGH_TENSION_THRESHOLD) set.add(signal);
  }
  for (const [signal, g] of Object.entries(selfVsRelationship)) {
    if (g >= HIGH_TENSION_THRESHOLD) set.add(signal);
  }
  for (const [signal, g] of Object.entries(partnerVsRelationship)) {
    if (g >= HIGH_TENSION_THRESHOLD) set.add(signal);
  }
  return [...set];
}

/**
 * Collect signal names where gap <= 2 in any of the three comparison maps.
 * No duplicates, no nulls.
 */
function collectStrongAlignment(
  selfVsPartner: Record<string, number>,
  selfVsRelationship: Record<string, number>,
  partnerVsRelationship: Record<string, number>,
): string[] {
  const set = new Set<string>();
  for (const [signal, g] of Object.entries(selfVsPartner)) {
    if (g <= STRONG_ALIGNMENT_THRESHOLD) set.add(signal);
  }
  for (const [signal, g] of Object.entries(selfVsRelationship)) {
    if (g <= STRONG_ALIGNMENT_THRESHOLD) set.add(signal);
  }
  for (const [signal, g] of Object.entries(partnerVsRelationship)) {
    if (g <= STRONG_ALIGNMENT_THRESHOLD) set.add(signal);
  }
  return [...set];
}

/**
 * Deterministic gap engine: compare self, partner, and relationship signals.
 * For each shared signal, if both values exist → gap = abs(a - b); if either is null → ignore.
 * highTensionSignals: gap >= 6 in any comparison. strongAlignmentSignals: gap <= 2 in any comparison.
 * No LLM. Pure math. No nulls in any returned list.
 */
export function computeGaps(
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
): GapEngineResult {
  const selfVsPartner = gapBetween(self.signals ?? {}, partner.signals ?? {});
  const selfVsRelationship = gapBetween(
    self.signals ?? {},
    relationship.signals ?? {},
  );
  const partnerVsRelationship = gapBetween(
    partner.signals ?? {},
    relationship.signals ?? {},
  );

  const highTensionSignals = collectHighTension(
    selfVsPartner,
    selfVsRelationship,
    partnerVsRelationship,
  );
  const strongAlignmentSignals = collectStrongAlignment(
    selfVsPartner,
    selfVsRelationship,
    partnerVsRelationship,
  );

  return {
    selfVsPartner,
    selfVsRelationship,
    partnerVsRelationship,
    highTensionSignals,
    strongAlignmentSignals,
  };
}
