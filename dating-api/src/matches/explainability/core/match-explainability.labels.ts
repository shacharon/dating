import type { BreakdownEntry } from '../../../compatibility/compatibility-score';
import type { SignalKey } from '../../../compatibility/compatibility-score';

export interface MatchExplainabilityDto {
  positiveChips: string[];
  /** Present only when friction >= 3 and a tension driver exists. */
  tensionChip?: string;
  reasonShort: string;
  /** Present when both profiles share at least one interest tag. */
  sharedInterestNote?: string;
  /** Up to 2 shared interest tags for distinct overlap chips (canonical preferred). */
  interestOverlapTags?: string[];
}

export interface MatchExplainabilityInput {
  compatibility: number;
  /** Overall match score; drives reason tone (not compatibility). */
  finalScore: number;
  friction: number;
  breakdown: BreakdownEntry[];
  tensionMatrix: Array<{ id: string; penalty: number }>;
  /** Shared interest tags from both profiles (used for the sharedInterestNote). */
  sharedInterests?: string[];
}

/** Fixed product labels per compatibility signal key (deterministic). */
export const POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, string> = {
  ambition: 'Ambition alignment',
  socialBattery: 'Social rhythm',
  healthBodyConsciousness: 'Wellness focus',
  emotionalDepth: 'Emotional depth',
  attachmentSecurity: 'Secure attachment',
  directness: 'Direct communication',
  independence: 'Independence fit',
  traditionalism: 'Shared values',
  financialMindset: 'Money mindset',
  relationshipClarity: 'Relationship expectations',
  spirituality: 'Shared values',
  lifestylePace: 'Lifestyle pace',
  physicalPriority: 'Physical chemistry',
  statusOrientation: 'Lifestyle & status',
  conflictStyle: 'Conflict approach',
};

/**
 * Coarse families for chip diversity (display-only). Multiple signals may share a label
 * (e.g. Shared values); diversity applies at label + source-key domain.
 */
export const SIGNAL_DOMAIN: Record<SignalKey, string> = {
  emotionalDepth: 'emotional',
  attachmentSecurity: 'emotional',
  directness: 'communication',
  conflictStyle: 'communication',
  socialBattery: 'social',
  ambition: 'ambition_money',
  financialMindset: 'ambition_money',
  healthBodyConsciousness: 'lifestyle',
  lifestylePace: 'lifestyle',
  physicalPriority: 'lifestyle',
  statusOrientation: 'lifestyle',
  traditionalism: 'values',
  spirituality: 'values',
  relationshipClarity: 'relationship',
  independence: 'relationship',
};

/** Diversity penalty per extra chip already chosen from the same domain (soft bias). */
export const DOMAIN_REPEAT_PENALTY = 32;

/** Max positive chips shown in match explainability (chip picker). */
export const MAX_POSITIVE_CHIPS = 5;

/** Short tension chip from top friction matrix rule (by penalty, then id). */
export const TENSION_CHIP_BY_ID: Record<string, string> = {
  stability_vs_nomadism: 'Stability vs mobility',
  emotional_depth_gap: 'Emotional depth gap',
  both_low_attachment: 'Attachment vulnerability',
  fusion_vs_boundaries: 'Closeness vs space',
  independence_mismatch: 'Different independence needs',
  attachment_anxiety_vs_directness: 'Sensitivity vs bluntness',
  traditional_vs_high_pace: 'Tradition vs fast pace',
  traditionalism_structure_gap: 'Different structure preferences',
  relationship_clarity_flow_gap: 'Different relationship expectations',
  social_battery_mismatch: 'Different social energy',
  lifestyle_pace_mismatch: 'Different pace of life',
  financial_mindset_mismatch: 'Different money mindset',
  status_orientation_mismatch: 'Different status focus',
  physical_priority_mismatch: 'Different physical priority',
  empathy_gap: 'Empathy mismatch',
  vulnerability_mismatch: 'Openness vs walls',
  emotional_volatility_gap: 'Emotional steadiness gap',
  affection_needs_gap: 'Different affection needs',
  humor_mismatch: 'Playfulness mismatch',
  intellectual_gap: 'Different mental stimulation needs',
  creative_mismatch: 'Creative drive mismatch',
  activity_level_gap: 'Different activity levels',
  domestic_out_mismatch: 'Home vs out mismatch',
  novelty_routine_clash: 'Novelty vs routine',
  casual_intimacy_clash: 'Casual vs committed intimacy',
  support_exchange_mismatch: 'Arrangement vs romance',
  support_both_provider: 'Both want to provide',
  support_both_recipient: 'Both seek support',
  religious_observance_gap: 'Religious practice gap',
  education_level_gap: 'Education expectations',
  honesty_integrity_gap: 'Honesty values gap',
  chronotype_clash: 'Morning vs night',
  repair_skills_gap: 'Different repair styles',
  both_low_repair: 'Conflict recovery risk',
  forgiveness_style_gap: 'Different forgiveness pace',
  stress_response_clash: 'Pursue vs withdraw under stress',
  jealousy_security_gap: 'Trust & space mismatch',
  both_high_jealousy: 'Shared jealousy risk',
  listening_presence_gap: 'Different listening styles',
  emotional_expression_gap: 'Different expression styles',
  growth_mindset_gap: 'Different growth pace',
  both_low_self_awareness: 'Self-insight gap',
  patience_tolerance_gap: 'Different tolerance levels',
  intimacy_pacing_clash: 'Different pace to closeness',
  monogamy_alignment_mismatch: 'Relationship structure mismatch',
  family_enmeshment_gap: 'Family involvement gap',
  friend_couple_balance_gap: 'Friends vs couple time',
  alone_time_need_gap: 'Different alone-time needs',
};
