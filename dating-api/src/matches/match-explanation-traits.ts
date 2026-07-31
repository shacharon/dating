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

/** Maps each known positive chip label to group, evidence, and list TLDR phrase. */
export const CHIP_TO_TRAIT: Record<
  string,
  {
    readonly group: string;
    readonly evidence: string;
    /** Short plain fragment for list cards — must not contain the chip label. */
    readonly listPhrase: string;
  }
> = {
  'Ambition alignment': {
    group: 'Shared values',
    evidence: 'Your drive and ambition are well-matched.',
    listPhrase: 'a drive for goals',
  },
  'Social rhythm': {
    group: 'Lifestyle match',
    evidence: 'Your social energy levels are well-matched.',
    listPhrase: 'matching social energy',
  },
  'Wellness focus': {
    group: 'Lifestyle match',
    evidence: 'Health and physicality matter to both of you.',
    listPhrase: 'care about health together',
  },
  'Emotional depth': {
    group: 'Emotional connection',
    evidence: 'You both value depth and emotional presence in a relationship.',
    // Avoid substring "emotional depth" (chip label).
    listPhrase: 'real depth and presence',
  },
  'Secure attachment': {
    group: 'Emotional connection',
    evidence:
      'You share a similar approach to closeness and emotional availability.',
    listPhrase: 'similar closeness style',
  },
  'Direct communication': {
    group: 'How you communicate',
    evidence: "You're both direct, which reduces misread signals.",
    listPhrase: 'being straight with each other',
  },
  'Independence fit': {
    group: 'Relationship vision',
    evidence:
      'Your need for space and togetherness is mutually compatible.',
    listPhrase: 'space and togetherness balance',
  },
  'Shared values': {
    group: 'Shared values',
    evidence:
      'You share meaningful common ground on values that shape daily life.',
    listPhrase: 'common ground on daily life',
  },
  'Money mindset': {
    group: 'Shared values',
    evidence: 'Your approach to finances and security is compatible.',
    listPhrase: 'similar money habits',
  },
  'Relationship expectations': {
    group: 'Relationship vision',
    evidence:
      "You're both looking for something similar in how a relationship works.",
    listPhrase: 'similar ideas about partnership',
  },
  'Lifestyle pace': {
    group: 'Lifestyle match',
    evidence:
      'You move at a similar pace — how you structure your days aligns.',
    listPhrase: 'a similar daily pace',
  },
  'Physical chemistry': {
    group: 'Lifestyle match',
    evidence: 'Physical attraction signals are strong and mutual.',
    listPhrase: 'strong mutual attraction',
  },
  'Lifestyle & status': {
    group: 'Lifestyle match',
    evidence: "You're aligned on lifestyle and social positioning.",
    listPhrase: 'similar lifestyle priorities',
  },
  'Conflict approach': {
    group: 'How you communicate',
    evidence:
      'You handle disagreement in compatible ways — conflict is less likely to derail you.',
    listPhrase: 'handling disagreement well',
  },
};

/**
 * Returns the first CHIP_TO_TRAIT key found in text (case-insensitive), else null.
 * Used to keep user-facing copy free of product chip labels.
 */
export function textContainsChipLabel(text: string): string | null {
  const lower = text.toLowerCase();
  // Longest keys first so e.g. "Ambition alignment" wins over shorter accidental hits.
  const keys = Object.keys(CHIP_TO_TRAIT).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key.toLowerCase())) {
      return key;
    }
  }
  return null;
}

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
