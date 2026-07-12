/**
 * Deterministic match recommendation layer: user-facing guidance above explainability.
 * No LLM, no randomness, no scoring changes — product decision layer only.
 */

import type { MatchExplainabilityDto } from './match-explainability';

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
 * Stable hash from string for deterministic template selection.
 * Returns integer 0..N-1 for N templates.
 */
function stableHash(s: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

/**
 * Extract a short hint from reasonShort when no chips exist.
 * Deterministic extraction: looks for first named dimension in text.
 */
function extractFallbackHint(reasonShort: string): string {
  const lower = reasonShort.toLowerCase();
  // Common dimension keywords that appear in reasonShort
  const keywords = [
    'emotional',
    'communication',
    'social',
    'ambition',
    'values',
    'lifestyle',
    'independence',
    'attachment',
    'relationship',
  ];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      return kw;
    }
  }
  return 'shared interests';
}

/**
 * Build primary takeaway based on finalScore bands.
 * Multi-chip support: uses top 2 chips when available.
 * Template variation: picks from 2-3 templates per band via stable hash.
 */
function buildPrimaryTakeaway(
  finalScore: number,
  explainability: MatchExplainabilityDto,
  stableId: string,
): string {
  const chips = explainability.positiveChips;
  const chipCount = chips.length;
  const variant = stableHash(stableId, 3);

  // Multi-chip: use top 2 when available
  if (chipCount >= 2) {
    const chip1 = chips[0].toLowerCase();
    const chip2 = chips[1].toLowerCase();
    const both = `${chip1} and ${chip2}`;

    if (finalScore >= 80) {
      if (variant === 0) return `Strong clear fit around ${both}.`;
      if (variant === 1) return `Excellent alignment on ${both}.`;
      return `Clear compatibility, especially ${both}.`;
    }
    if (finalScore >= 60) {
      if (variant === 0) return `Solid fit with alignment on ${both}.`;
      if (variant === 1) return `Good match around ${both}.`;
      return `Promising fit on ${both}.`;
    }
    if (finalScore >= 50) {
      if (variant === 0) return `Moderate fit with overlap on ${both}.`;
      if (variant === 1) return `Some alignment around ${both}.`;
      return `Mixed but real overlap on ${both}.`;
    }
    if (finalScore >= 40) {
      if (variant === 0) return `Partial overlap around ${both}.`;
      return `Limited but present fit on ${both}.`;
    }
    if (variant === 0) return `Narrow overlap on ${both}.`;
    return `Minimal fit, mainly ${both}.`;
  }

  // Single chip
  if (chipCount === 1) {
    const chip = chips[0].toLowerCase();
    if (finalScore >= 80) {
      if (variant === 0) return `Strong clear fit, especially around ${chip}.`;
      if (variant === 1) return `Excellent match on ${chip}.`;
      return `Clear compatibility around ${chip}.`;
    }
    if (finalScore >= 60) {
      if (variant === 0) return `Solid fit with good alignment on ${chip}.`;
      if (variant === 1) return `Good match around ${chip}.`;
      return `Promising alignment on ${chip}.`;
    }
    if (finalScore >= 50) {
      if (variant === 0) return `Moderate fit with some overlap on ${chip}.`;
      if (variant === 1) return `Some alignment on ${chip}.`;
      return `Mixed fit with real overlap on ${chip}.`;
    }
    if (finalScore >= 40) {
      if (variant === 0) return `Partial overlap, mainly around ${chip}.`;
      return `Limited fit around ${chip}.`;
    }
    if (variant === 0) return `Limited fit with narrow overlap on ${chip}.`;
    return `Minimal overlap on ${chip}.`;
  }

  // No chips: extract hint from reasonShort
  const hint = extractFallbackHint(explainability.reasonShort);
  if (finalScore >= 60) {
    return `Solid fit worth exploring, especially ${hint}.`;
  }
  if (finalScore >= 50) {
    return `Moderate fit with some ${hint} alignment.`;
  }
  if (finalScore >= 40) {
    return `Partial overlap in ${hint} areas.`;
  }
  return `Limited fit with narrow ${hint} overlap.`;
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
