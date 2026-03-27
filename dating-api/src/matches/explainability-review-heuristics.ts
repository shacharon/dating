/**
 * Deterministic quality heuristics for stored match explainability (review tooling only).
 * Does not affect scoring or runtime explainability generation.
 */

import type { MatchExplainabilityDto } from './match-explainability';
import {
  POSITIVE_CHIP_BY_SIGNAL,
  TENSION_CHIP_BY_ID,
} from './match-explainability';

/** All labels the generator may emit for positive chips. */
export const KNOWN_POSITIVE_CHIP_LABELS = new Set<string>(
  Object.values(POSITIVE_CHIP_BY_SIGNAL),
);

/** All labels the generator may emit for tension chips (excludes raw-id fallback strings). */
export const KNOWN_TENSION_CHIP_LABELS = new Set<string>(
  Object.values(TENSION_CHIP_BY_ID),
);

/** Boilerplate sentence fragments from older / edge explainability (weak copy). */
export const BOILERPLATE_REASON_MARKERS = [
  'limited highlighted alignments',
  'strongest highlight tier',
  'no dimensions reached',
] as const;

export type ExplainabilityReviewFlags =
  | 'missing_explainability'
  | 'empty_reason'
  | 'very_short_reason'
  | 'boilerplate_no_chip_copy'
  | 'duplicate_positive_chip'
  | 'unknown_positive_chip'
  | 'tension_chip_when_friction_low'
  | 'high_friction_no_tension_chip'
  | 'narrative_strong_vs_low_final_score'
  | 'unknown_tension_chip_label';

export interface ExplainabilityReviewRowInput {
  matchId: string;
  pairLabel: string;
  finalScore: number;
  compatibility?: number;
  friction?: number;
  explainability?: MatchExplainabilityDto | null;
}

export interface ExplainabilityReviewRowResult {
  matchId: string;
  pairLabel: string;
  finalScore: number;
  compatibility?: number;
  friction?: number;
  explainability?: MatchExplainabilityDto;
  flags: ExplainabilityReviewFlags[];
  suspiciousScore: number;
}

const WEIGHT: Record<ExplainabilityReviewFlags, number> = {
  missing_explainability: 50,
  empty_reason: 40,
  very_short_reason: 15,
  boilerplate_no_chip_copy: 25,
  duplicate_positive_chip: 30,
  unknown_positive_chip: 20,
  tension_chip_when_friction_low: 25,
  high_friction_no_tension_chip: 15,
  narrative_strong_vs_low_final_score: 20,
  unknown_tension_chip_label: 10,
};

function hasBoilerplateMarker(reason: string): boolean {
  const r = reason.toLowerCase();
  return BOILERPLATE_REASON_MARKERS.some((m) => r.includes(m.toLowerCase()));
}

/**
 * Analyze one match record's explainability slice for review / reporting.
 */
export function analyzeExplainabilityRow(
  input: ExplainabilityReviewRowInput,
): ExplainabilityReviewRowResult {
  const flags: ExplainabilityReviewFlags[] = [];
  const ex = input.explainability;

  if (ex == null) {
    flags.push('missing_explainability');
    return {
      matchId: input.matchId,
      pairLabel: input.pairLabel,
      finalScore: input.finalScore,
      compatibility: input.compatibility,
      friction: input.friction,
      flags,
      suspiciousScore: WEIGHT.missing_explainability,
    };
  }

  const reason = (ex.reasonShort ?? '').trim();
  if (reason.length === 0) flags.push('empty_reason');
  else if (reason.length < 28) flags.push('very_short_reason');

  if (ex.positiveChips.length === 0 && hasBoilerplateMarker(reason)) {
    flags.push('boilerplate_no_chip_copy');
  }

  const chipSeen = new Set<string>();
  let hasDuplicateChip = false;
  let hasUnknownChip = false;
  for (const c of ex.positiveChips) {
    if (chipSeen.has(c)) hasDuplicateChip = true;
    chipSeen.add(c);
    if (!KNOWN_POSITIVE_CHIP_LABELS.has(c)) hasUnknownChip = true;
  }
  if (hasDuplicateChip) flags.push('duplicate_positive_chip');
  if (hasUnknownChip) flags.push('unknown_positive_chip');

  const friction = input.friction ?? 0;
  if (ex.tensionChip != null && friction < 3) {
    flags.push('tension_chip_when_friction_low');
  }
  if (friction >= 3 && ex.tensionChip == null) {
    flags.push('high_friction_no_tension_chip');
  }

  if (/\bstrong overlap\b/i.test(reason) && input.finalScore < 42) {
    flags.push('narrative_strong_vs_low_final_score');
  }

  if (ex.tensionChip != null && !KNOWN_TENSION_CHIP_LABELS.has(ex.tensionChip)) {
    flags.push('unknown_tension_chip_label');
  }

  const suspiciousScore = [...new Set(flags)].reduce(
    (s, f) => s + WEIGHT[f],
    0,
  );

  return {
    matchId: input.matchId,
    pairLabel: input.pairLabel,
    finalScore: input.finalScore,
    compatibility: input.compatibility,
    friction: input.friction,
    explainability: ex,
    flags: [...new Set(flags)],
    suspiciousScore,
  };
}

export function pairLabelFromRecord(aName: string, bName: string): string {
  return `${aName} / ${bName}`;
}
