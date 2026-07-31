/**
 * Deterministic match recommendation layer: user-facing guidance above explainability.
 * No LLM, no randomness, no scoring changes — product decision layer only.
 */

import type { MatchExplainabilityDto } from './match-explainability';
import { buildPlainMatchListTldr } from './match-list-tldr';

export interface MatchRecommendationDto {
  explainability: MatchExplainabilityDto;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
}

export interface MatchRecommendationInput {
  finalScore: number;
  friction: number;
  explainability: MatchExplainabilityDto;
  dealbreakers?: string[];
  /** Optional stable ID for template variation (e.g. matchId); defaults to finalScore. */
  stableId?: string;
}

/** Dealbreaker family buckets for concrete caution phrases. */
const DEALBREAKER_FAMILY: Record<string, string> = {
  KIDS_MISMATCH: 'lifestyle',
  LOCATION_MISMATCH: 'logistics',
  RELIGION_MISMATCH: 'values',
  POLITICS_MISMATCH: 'values',
  SMOKING_MISMATCH: 'lifestyle',
  PETS_MISMATCH: 'lifestyle',
  DIET_MISMATCH: 'lifestyle',
  RELATIONSHIP_TYPE_MISMATCH: 'values',
};

const DEALBREAKER_CAUTION_BY_FAMILY: Record<string, string> = {
  lifestyle: 'Note lifestyle compatibility differences.',
  values: 'Note core values differences.',
  logistics: 'Note practical logistics concerns.',
};

/**
 * Build primary takeaway: plain list TLDR (Sprint 23 Story 1).
 * `stableId` retained for API compatibility; unused by the plain builder.
 */
function buildPrimaryTakeaway(
  finalScore: number,
  explainability: MatchExplainabilityDto,
  _stableId: string,
): string {
  return buildPlainMatchListTldr({
    finalScore,
    positiveChips: explainability.positiveChips,
    sharedInterestNote: explainability.sharedInterestNote,
  });
}

/**
 * Build caution message when friction >= 3 or dealbreakers exist.
 * Prefers explainability.tensionChip, then concrete dealbreaker family phrase.
 */
function buildCaution(
  friction: number,
  explainability: MatchExplainabilityDto,
  dealbreakers?: string[],
): string | undefined {
  if (friction < 3 && (!dealbreakers || dealbreakers.length === 0)) {
    return undefined;
  }

  // Prefer tension chip from explainability (most specific)
  if (explainability.tensionChip) {
    return `Watch for ${explainability.tensionChip.toLowerCase()}.`;
  }

  // Map dealbreakers to family-based concrete caution
  if (dealbreakers && dealbreakers.length > 0) {
    const families = new Set<string>();
    for (const db of dealbreakers) {
      const family = DEALBREAKER_FAMILY[db] ?? 'values';
      families.add(family);
    }
    // Pick first family alphabetically for determinism
    const sorted = Array.from(families).sort();
    const family = sorted[0];
    return (
      DEALBREAKER_CAUTION_BY_FAMILY[family] ?? 'Note compatibility differences.'
    );
  }

  // Generic friction warning (last resort)
  if (friction >= 3) {
    return 'Some friction points to consider.';
  }

  return undefined;
}

/**
 * Build suggested next action based on finalScore bands.
 */
function buildSuggestedNextAction(finalScore: number): string {
  if (finalScore >= 80) {
    return 'Start a conversation';
  }

  if (finalScore >= 60) {
    return 'Review profile and message';
  }

  if (finalScore >= 50) {
    return 'Worth a closer look';
  }

  if (finalScore >= 40) {
    return 'Skim profile first';
  }

  return 'Consider other matches first';
}

/**
 * Build complete match recommendation from scoring output.
 * Deterministic only: no LLM, no randomness, no engine jargon.
 */
export function buildMatchRecommendation(
  input: MatchRecommendationInput,
): MatchRecommendationDto {
  const stableId = input.stableId ?? String(input.finalScore);
  const primaryTakeaway = buildPrimaryTakeaway(
    input.finalScore,
    input.explainability,
    stableId,
  );
  const caution = buildCaution(
    input.friction,
    input.explainability,
    input.dealbreakers,
  );
  const suggestedNextAction = buildSuggestedNextAction(input.finalScore);

  return {
    explainability: input.explainability,
    primaryTakeaway,
    ...(caution !== undefined ? { caution } : {}),
    suggestedNextAction,
  };
}
