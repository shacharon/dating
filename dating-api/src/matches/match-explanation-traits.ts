/**
 * Deterministic user-facing compatibility traits derived from
 * `MatchExplainabilityDto.positiveChips` (no scoring changes, no LLM).
 */

export type MatchExplanationTraitStrength = 'strong' | 'moderate';

export interface MatchExplanationTrait {
  group: string;
  label: string;
  evidence: string;
  strength: MatchExplanationTraitStrength;
}

/** Maps each known positive chip label to a user-facing group + evidence line. */
export const CHIP_TO_TRAIT: Record<
  string,
  { readonly group: string; readonly evidence: string }
> = {
  'Ambition alignment': {
    group: 'Shared values',
    evidence: 'Your drive and ambition are well-matched.',
  },
  'Social rhythm': {
    group: 'Lifestyle match',
    evidence: 'Your social energy levels are well-matched.',
  },
  'Wellness focus': {
    group: 'Lifestyle match',
    evidence: 'Health and physicality matter to both of you.',
  },
  'Emotional depth': {
    group: 'Emotional connection',
    evidence: 'You both value depth and emotional presence in a relationship.',
  },
  'Secure attachment': {
    group: 'Emotional connection',
    evidence:
      'You share a similar approach to closeness and emotional availability.',
  },
  'Direct communication': {
    group: 'How you communicate',
    evidence: "You're both direct, which reduces misread signals.",
  },
  'Independence fit': {
    group: 'Relationship vision',
    evidence:
      'Your need for space and togetherness is mutually compatible.',
  },
  'Shared values': {
    group: 'Shared values',
    evidence:
      'You share meaningful common ground on values that shape daily life.',
  },
  'Money mindset': {
    group: 'Shared values',
    evidence: 'Your approach to finances and security is compatible.',
  },
  'Relationship expectations': {
    group: 'Relationship vision',
    evidence:
      "You're both looking for something similar in how a relationship works.",
  },
  'Lifestyle pace': {
    group: 'Lifestyle match',
    evidence:
      'You move at a similar pace — how you structure your days aligns.',
  },
  'Physical chemistry': {
    group: 'Lifestyle match',
    evidence: 'Physical attraction signals are strong and mutual.',
  },
  'Lifestyle & status': {
    group: 'Lifestyle match',
    evidence: "You're aligned on lifestyle and social positioning.",
  },
  'Conflict approach': {
    group: 'How you communicate',
    evidence:
      'You handle disagreement in compatible ways — conflict is less likely to derail you.',
  },
};

/**
 * Builds up to five traits from engine positive chip labels.
 * Unknown chip strings are skipped. Strength follows overall match score bands only.
 */
export function buildMatchExplanationTraits(
  positiveChips: readonly string[],
  finalScore: number,
): MatchExplanationTrait[] {
  const strength: MatchExplanationTraitStrength =
    finalScore >= 65 ? 'strong' : 'moderate';
  const out: MatchExplanationTrait[] = [];
  for (const chip of positiveChips.slice(0, 5)) {
    const meta = CHIP_TO_TRAIT[chip];
    if (!meta) continue;
    out.push({
      group: meta.group,
      label: chip,
      evidence: meta.evidence,
      strength,
    });
  }
  return out;
}
