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
  'Understanding & care': {
    group: 'Emotional connection',
    evidence:
      "You both lead with empathy and genuine care for each other's feelings",
    listPhrase: 'empathy and care for each other',
  },
  'Authentic openness': {
    group: 'Emotional connection',
    evidence: "You're both comfortable being real and showing vulnerability",
    listPhrase: 'authentic openness together',
  },
  'Emotional balance': {
    group: 'Emotional connection',
    evidence: 'You both handle emotions in balanced, non-reactive ways',
    listPhrase: 'balanced emotional handling together',
  },
  'Affection rhythm match': {
    group: 'Physical connection',
    evidence: 'Your needs for touch and physical closeness align well',
    listPhrase: 'aligned touch and closeness needs',
  },
  'Shared playfulness': {
    group: 'Connection & play',
    evidence: 'You bring out lightness and laughter in each other',
    listPhrase: 'lightness and laughter together',
  },
  'Mental stimulation': {
    group: 'Ideas & growth',
    evidence: 'You both value ideas, learning, and intellectual growth',
    listPhrase: 'shared intellectual growth',
  },
  'Creative expression': {
    group: 'Creativity & making',
    evidence: 'You both value creativity and making things',
    listPhrase: 'shared creative expression',
  },
  'Activity level match': {
    group: 'Lifestyle match',
    evidence:
      'Your physical activity levels and fitness priorities align',
    listPhrase: 'aligned activity levels',
  },
  'Home/out balance': {
    group: 'Lifestyle match',
    evidence: "You're aligned on spending time at home vs going out",
    listPhrase: 'aligned home vs out preferences',
  },
  'Adventure & novelty': {
    group: 'Lifestyle match',
    evidence: "You're both excited by new experiences and variety",
    listPhrase: 'shared adventure and novelty',
  },
  'Intimacy expectations': {
    group: 'Physical connection',
    evidence:
      "You're aligned on what physical intimacy means in your connection",
    listPhrase: 'aligned intimacy expectations',
  },
  'Support & arrangement style': {
    group: 'Relationship structure',
    evidence:
      'You share similar expectations about support and relationship structure',
    listPhrase: 'similar support expectations',
  },
  'Financial support alignment': {
    group: 'Relationship structure',
    evidence: "You're aligned on financial support in the relationship",
    listPhrase: 'aligned financial support',
  },
  'Non-transactional match': {
    group: 'Relationship structure',
    evidence:
      'You both want a relationship without financial arrangements',
    listPhrase: 'non-transactional relationship',
  },
  'Religious practice': {
    group: 'Values match',
    evidence: 'Your level of religious practice is well-matched',
    listPhrase: 'matched religious practice',
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
