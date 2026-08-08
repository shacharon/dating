import { describe, it, expect } from 'vitest';
import { getCopy } from '@/lib/i18n';
import {
  CHIP_EVIDENCE_CODES,
  CHIP_EVIDENCE_KEYS,
  CHIP_EVIDENCE_LEGACY_LABEL_TO_CODE,
  chipToEvidence,
  resolveChipEvidenceCode,
} from '@/lib/matches/chip-evidence';

describe('resolveChipEvidenceCode', () => {
  it('maps legacy English labels to stable codes', () => {
    expect(resolveChipEvidenceCode('Ambition alignment')).toBe(
      'ambition_alignment',
    );
    expect(resolveChipEvidenceCode('Home/out balance')).toBe(
      'home_out_balance',
    );
    expect(resolveChipEvidenceCode('Lifestyle & status')).toBe(
      'lifestyle_and_status',
    );
  });

  it('trims whitespace before resolving', () => {
    expect(resolveChipEvidenceCode('  Ambition alignment  ')).toBe(
      'ambition_alignment',
    );
    expect(resolveChipEvidenceCode('  ambition_alignment  ')).toBe(
      'ambition_alignment',
    );
  });

  it('passes through already-stable codes', () => {
    expect(resolveChipEvidenceCode('ambition_alignment')).toBe(
      'ambition_alignment',
    );
  });

  it('passes through unknown strings', () => {
    expect(resolveChipEvidenceCode('Unknown chip')).toBe('Unknown chip');
  });

  it('maps every legacy label to a known code (bijective coverage)', () => {
    const codesFromLegacy = Object.values(CHIP_EVIDENCE_LEGACY_LABEL_TO_CODE);
    expect(new Set(codesFromLegacy).size).toBe(CHIP_EVIDENCE_CODES.length);
    expect(codesFromLegacy.sort()).toEqual([...CHIP_EVIDENCE_CODES].sort());
    for (const [label, code] of Object.entries(
      CHIP_EVIDENCE_LEGACY_LABEL_TO_CODE,
    )) {
      expect(resolveChipEvidenceCode(label)).toBe(code);
      expect(CHIP_EVIDENCE_CODES).toContain(code);
      expect(label.includes('_')).toBe(false);
    }
  });
});

describe('chipToEvidence', () => {
  const enMap = getCopy('en').matches.list.browse.chipEvidence;
  const heMap = getCopy('he').matches.list.browse.chipEvidence;
  const esMap = getCopy('es').matches.list.browse.chipEvidence;

  it('maps known chip labels to English evidence', () => {
    expect(chipToEvidence('Ambition alignment', enMap)).toBe(
      'Your drive and ambition are well-matched',
    );
    expect(chipToEvidence('ambition_alignment', enMap)).toBe(
      'Your drive and ambition are well-matched',
    );
    expect(chipToEvidence('Secure attachment', enMap)).toBe(
      'You share a similar approach to closeness and emotional availability',
    );
    expect(chipToEvidence('Wellness focus', enMap)).toBe(
      'Health and physicality matter to both of you',
    );
  });

  it('maps known chip labels to Hebrew evidence', () => {
    expect(chipToEvidence('Ambition alignment', heMap)).toBe(
      'הדרייב והשאיפות שלכם תואמים היטב',
    );
    expect(chipToEvidence('Secure attachment', heMap)).toBe(
      'יש לכם גישה דומה לקרבה ולזמינות רגשית',
    );
    expect(chipToEvidence('Wellness focus', heMap)).toBe(
      'בריאות וגוף חשובים לשניכם',
    );
  });

  it('maps known chip labels to Spanish evidence', () => {
    expect(chipToEvidence('Ambition alignment', esMap)).toBe(
      'Su impulso y ambicion estan bien alineados',
    );
    expect(chipToEvidence('Secure attachment', esMap)).toBe(
      'Comparten un enfoque similar hacia la cercania y la disponibilidad emocional',
    );
    expect(chipToEvidence('Wellness focus', esMap)).toBe(
      'La salud y el cuerpo les importan a ambos',
    );
  });

  it('returns original label for unknown chips', () => {
    expect(chipToEvidence('Unknown chip', enMap)).toBe('Unknown chip');
  });

  it('covers all documented chip codes in every locale', () => {
    for (const locale of ['en', 'he', 'es'] as const) {
      const map = getCopy(locale).matches.list.browse.chipEvidence;
      for (const chip of CHIP_EVIDENCE_CODES) {
        const evidence = chipToEvidence(chip, map);
        expect(evidence).not.toBe(chip);
        expect(evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('includes all 10 expansion product chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_PRODUCT_CODES = [
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
    ] as const;
    for (const chip of EXPANSION_PRODUCT_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-07 profile-gap chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_07_CODES = [
      'intimacy_expectations',
      'support_and_arrangement_style',
      'financial_support_alignment',
      'non_transactional_match',
      'religious_practice',
    ] as const;
    for (const chip of EXPANSION_07_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-10 conflict recovery chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_10_CODES = [
      'conflict_recovery',
      'letting_go_and_moving_forward',
    ] as const;
    for (const chip of EXPANSION_10_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-11 stress & security chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_11_CODES = [
      'support_under_pressure',
      'secure_and_trusting',
    ] as const;
    for (const chip of EXPANSION_11_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-12 feeling-heard chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_12_CODES = ['feels_heard', 'expressiveness_match'] as const;
    for (const chip of EXPANSION_12_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-13 growth & self-awareness chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_13_CODES = [
      'grows_together',
      'self_awareness_match',
    ] as const;
    for (const chip of EXPANSION_13_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-14 tolerance & intimacy pacing chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_14_CODES = [
      'patience_match',
      'pace_of_closeness',
      'aligned_on_relationship_structure',
    ] as const;
    for (const chip of EXPANSION_14_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-15 family & social ecosystem chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_15_CODES = [
      'family_style_match',
      'friends_and_couple_balance',
      'recharge_style_match',
    ] as const;
    expect(CHIP_EVIDENCE_KEYS.length).toBe(43);
    for (const chip of EXPANSION_15_CODES) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('avoids generic jargon in English evidence strings', () => {
    const evidence = chipToEvidence('Ambition alignment', enMap);
    expect(evidence.toLowerCase()).not.toContain('alignment');
  });

  it('i18n maps do not use English titles as keys and match code set exactly', () => {
    for (const locale of ['en', 'he', 'es'] as const) {
      const keys = Object.keys(
        getCopy(locale).matches.list.browse.chipEvidence,
      );
      expect(keys.some((k) => k.includes(' '))).toBe(false);
      expect(keys.sort()).toEqual([...CHIP_EVIDENCE_CODES].sort());
    }
  });
});
