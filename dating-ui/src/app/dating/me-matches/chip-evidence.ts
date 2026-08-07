/**
 * Maps internal English chip labels to user-facing evidence strings.
 * Locale-specific text lives in i18n copy (`matches.list.browse.chipEvidence`).
 */

/** API chip labels (English keys from the match engine). */
export const CHIP_EVIDENCE_KEYS = [
  'Ambition alignment',
  'Social rhythm',
  'Wellness focus',
  'Emotional depth',
  'Secure attachment',
  'Direct communication',
  'Independence fit',
  'Shared values',
  'Money mindset',
  'Relationship expectations',
  'Lifestyle pace',
  'Physical chemistry',
  'Lifestyle & status',
  'Conflict approach',
] as const;

export type ChipEvidenceKey = (typeof CHIP_EVIDENCE_KEYS)[number];

export type ChipEvidenceMap = Record<ChipEvidenceKey, string>;

/**
 * Converts a chip label to its user-facing evidence string for the given locale map.
 * Falls back to the original label if not found (unknown chips).
 */
export function chipToEvidence(
  chipLabel: string,
  evidenceMap: Partial<ChipEvidenceMap> | ChipEvidenceMap,
): string {
  return evidenceMap[chipLabel as ChipEvidenceKey] ?? chipLabel;
}
