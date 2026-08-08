/**
 * Stable chip-evidence product codes + dual-read from legacy English wire labels.
 * Locale display strings live in i18n (`matches.list.browse.chipEvidence`).
 */

export const CHIP_EVIDENCE_CODES = [
  'ambition_alignment',
  'social_rhythm',
  'wellness_focus',
  'emotional_depth',
  'secure_attachment',
  'direct_communication',
  'independence_fit',
  'shared_values',
  'money_mindset',
  'relationship_expectations',
  'lifestyle_pace',
  'physical_chemistry',
  'lifestyle_and_status',
  'conflict_approach',
  'understanding_and_care',
  'authentic_openness',
  'emotional_balance',
  'affection_rhythm_match',
  'shared_playfulness',
  'mental_stimulation',
  'creative_expression',
  'activity_level_match',
  'home_out_balance',
  'adventure_and_novelty',
  'intimacy_expectations',
  'support_and_arrangement_style',
  'financial_support_alignment',
  'non_transactional_match',
  'religious_practice',
  'conflict_recovery',
  'letting_go_and_moving_forward',
  'support_under_pressure',
  'secure_and_trusting',
  'feels_heard',
  'expressiveness_match',
  'grows_together',
  'self_awareness_match',
  'patience_match',
  'pace_of_closeness',
  'aligned_on_relationship_structure',
  'family_style_match',
  'friends_and_couple_balance',
  'recharge_style_match',
] as const;

export type ChipEvidenceCode = (typeof CHIP_EVIDENCE_CODES)[number];

/** @deprecated Use ChipEvidenceCode — kept for import compatibility. */
export type ChipEvidenceKey = ChipEvidenceCode;

/** @deprecated Use CHIP_EVIDENCE_CODES. */
export const CHIP_EVIDENCE_KEYS = CHIP_EVIDENCE_CODES;

export type ChipEvidenceMap = Record<ChipEvidenceCode, string>;

/** Legacy English API chip labels → stable product codes. */
export const CHIP_EVIDENCE_LEGACY_LABEL_TO_CODE: Record<string, ChipEvidenceCode> =
  {
    'Ambition alignment': 'ambition_alignment',
    'Social rhythm': 'social_rhythm',
    'Wellness focus': 'wellness_focus',
    'Emotional depth': 'emotional_depth',
    'Secure attachment': 'secure_attachment',
    'Direct communication': 'direct_communication',
    'Independence fit': 'independence_fit',
    'Shared values': 'shared_values',
    'Money mindset': 'money_mindset',
    'Relationship expectations': 'relationship_expectations',
    'Lifestyle pace': 'lifestyle_pace',
    'Physical chemistry': 'physical_chemistry',
    'Lifestyle & status': 'lifestyle_and_status',
    'Conflict approach': 'conflict_approach',
    'Understanding & care': 'understanding_and_care',
    'Authentic openness': 'authentic_openness',
    'Emotional balance': 'emotional_balance',
    'Affection rhythm match': 'affection_rhythm_match',
    'Shared playfulness': 'shared_playfulness',
    'Mental stimulation': 'mental_stimulation',
    'Creative expression': 'creative_expression',
    'Activity level match': 'activity_level_match',
    'Home/out balance': 'home_out_balance',
    'Adventure & novelty': 'adventure_and_novelty',
    'Intimacy expectations': 'intimacy_expectations',
    'Support & arrangement style': 'support_and_arrangement_style',
    'Financial support alignment': 'financial_support_alignment',
    'Non-transactional match': 'non_transactional_match',
    'Religious practice': 'religious_practice',
    'Conflict recovery': 'conflict_recovery',
    'Letting go & moving forward': 'letting_go_and_moving_forward',
    'Support under pressure': 'support_under_pressure',
    'Secure & trusting': 'secure_and_trusting',
    'Feels heard': 'feels_heard',
    'Expressiveness match': 'expressiveness_match',
    'Grows together': 'grows_together',
    'Self-awareness match': 'self_awareness_match',
    'Patience match': 'patience_match',
    'Pace of closeness': 'pace_of_closeness',
    'Aligned on relationship structure': 'aligned_on_relationship_structure',
    'Family style match': 'family_style_match',
    'Friends & couple balance': 'friends_and_couple_balance',
    'Recharge style match': 'recharge_style_match',
  };

const CODE_SET = new Set<string>(CHIP_EVIDENCE_CODES);

/**
 * Resolves a wire value (legacy English label or already-stable code) to a code.
 * Unknown strings pass through unchanged.
 */
export function resolveChipEvidenceCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (CODE_SET.has(trimmed)) return trimmed;
  return CHIP_EVIDENCE_LEGACY_LABEL_TO_CODE[trimmed] ?? trimmed;
}

/**
 * Converts a chip (code or legacy English label) to its user-facing evidence string.
 * Falls back to the original input if not found.
 */
export function chipToEvidence(
  rawOrCode: string,
  evidenceMap: Partial<ChipEvidenceMap> | ChipEvidenceMap,
): string {
  const code = resolveChipEvidenceCode(rawOrCode);
  return evidenceMap[code as ChipEvidenceCode] ?? rawOrCode;
}
