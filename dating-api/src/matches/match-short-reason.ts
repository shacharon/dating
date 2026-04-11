/**
 * Deterministic shortReason for match list / transparent reasons screen.
 * No LLM; rule-based only. Same inputs always produce the same string.
 */

export interface ShortReasonInput {
  finalScore: number;
  dealbreakers: Array<{ code: string; severity?: string }>;
}

/** Human-readable label per dealbreaker code for shortReason. */
const DEALBREAKER_LABELS: Record<string, string> = {
  RELATIONSHIP_CLARITY_MISMATCH: 'relationship clarity gap',
  STATUS_GAP_SENSITIVE: 'status gap',
  LIFESTAGE_GAP: 'life stage gap',
  VISIBILITY_NEED_MISMATCH: 'visibility needs',
  EMOTIONAL_DEPTH_FLOOR: 'emotional depth',
  UNPREDICTABILITY_ROUTINE_MISMATCH: 'schedule vs routine',
};

function labelForCode(code: string): string {
  if (code === 'KIDS_TIMELINE_MISMATCH') {
    return 'relationship clarity gap';
  }
  return DEALBREAKER_LABELS[code] ?? code;
}

/**
 * Build one short reason string from score and dealbreakers.
 * Deterministic and explainable: score bands + presence of HARD + dealbreaker labels.
 */
export function buildShortReason(input: ShortReasonInput): string {
  const { finalScore, dealbreakers } = input;
  const hasHard = dealbreakers.some((d) => d.severity === 'HARD');
  const codes = dealbreakers.map((d) => d.code);
  const labels = [...new Set(codes.map(labelForCode))];

  // High score, no hard blockers → strong alignment
  if (finalScore >= 70 && !hasHard && labels.length === 0) {
    return 'Strong alignment, no hard blockers';
  }
  if (finalScore >= 70 && !hasHard && labels.length > 0) {
    return `Strong alignment; ${labels.join(' and ').toLowerCase()} noted`;
  }

  // Good fit with one main concern (e.g. kids timeline)
  if (finalScore >= 50 && finalScore < 70 && labels.length === 1) {
    const label = labels[0]!;
    if (label === 'relationship clarity gap') {
      return 'Good fit, but relationship clarity gap';
    }
    return `Good fit, but ${label}`;
  }
  if (finalScore >= 50 && finalScore < 70 && labels.length > 1) {
    return `Good fit, but ${labels.slice(0, 2).join(' and ').toLowerCase()}`;
  }

  // Low fit: emphasize main reasons
  if (finalScore < 40) {
    if (hasHard) {
      const main = labels.slice(0, 2).join(' and ');
      return `Low fit due to ${main}`;
    }
    if (labels.length >= 2) {
      return `Low fit due to ${labels.slice(0, 2).join(' and ').toLowerCase()}`;
    }
    if (labels.length === 1) {
      return `Low fit: ${labels[0]!.toLowerCase()}`;
    }
    return 'Low fit';
  }

  // Mid band 40–50
  if (finalScore >= 40 && finalScore < 50) {
    if (labels.length >= 2) {
      return `Moderate fit; ${labels.slice(0, 2).join(' and ').toLowerCase()} mismatch`;
    }
    if (labels.length === 1) {
      return `Moderate fit; ${labels[0]!.toLowerCase()} mismatch`;
    }
    return 'Moderate fit';
  }

  // 70+ with hard (should be rare after policy change)
  if (finalScore >= 70 && hasHard) {
    return `Strong score; ${labels.slice(0, 2).join(' and ').toLowerCase()} flagged`;
  }

  return labels.length > 0
    ? `Fit with ${labels.join(', ').toLowerCase()} noted`
    : 'Moderate alignment';
}
