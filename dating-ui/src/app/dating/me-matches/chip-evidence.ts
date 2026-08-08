/**
 * Re-export stable chip-evidence contract from lib/matches.
 * Prefer importing from `@/lib/matches/chip-evidence` in new code.
 */
export {
  CHIP_EVIDENCE_CODES,
  CHIP_EVIDENCE_KEYS,
  CHIP_EVIDENCE_LEGACY_LABEL_TO_CODE,
  chipToEvidence,
  resolveChipEvidenceCode,
  type ChipEvidenceCode,
  type ChipEvidenceKey,
  type ChipEvidenceMap,
} from '@/lib/matches/chip-evidence';
