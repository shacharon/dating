import { describe, it, expect } from 'vitest';
import { getCopy } from '@/lib/i18n';
import {
  CHIP_EVIDENCE_KEYS,
  chipToEvidence,
} from './chip-evidence';

describe('chipToEvidence', () => {
  const enMap = getCopy('en').matches.list.browse.chipEvidence;
  const heMap = getCopy('he').matches.list.browse.chipEvidence;
  const esMap = getCopy('es').matches.list.browse.chipEvidence;

  it('maps known chip labels to English evidence', () => {
    expect(chipToEvidence('Ambition alignment', enMap)).toBe(
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

  it('covers all documented chip labels in every locale', () => {
    for (const locale of ['en', 'he', 'es'] as const) {
      const map = getCopy(locale).matches.list.browse.chipEvidence;
      for (const chip of CHIP_EVIDENCE_KEYS) {
        const evidence = chipToEvidence(chip, map);
        expect(evidence).not.toBe(chip);
        expect(evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('includes all 10 expansion product chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_PRODUCT_CHIPS = [
      'Understanding & care',
      'Authentic openness',
      'Emotional balance',
      'Affection rhythm match',
      'Shared playfulness',
      'Mental stimulation',
      'Creative expression',
      'Activity level match',
      'Home/out balance',
      'Adventure & novelty',
    ] as const;
    for (const chip of EXPANSION_PRODUCT_CHIPS) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-07 profile-gap chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_07_CHIPS = [
      'Intimacy expectations',
      'Support & arrangement style',
      'Financial support alignment',
      'Non-transactional match',
      'Religious practice',
    ] as const;
    for (const chip of EXPANSION_07_CHIPS) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('includes Expansion-10 conflict recovery chips in CHIP_EVIDENCE_KEYS', () => {
    const EXPANSION_10_CHIPS = [
      'Conflict recovery',
      'Letting go & moving forward',
    ] as const;
    expect(CHIP_EVIDENCE_KEYS.length).toBe(31);
    for (const chip of EXPANSION_10_CHIPS) {
      expect(CHIP_EVIDENCE_KEYS as readonly string[]).toContain(chip);
    }
  });

  it('avoids generic jargon in English evidence strings', () => {
    const evidence = chipToEvidence('Ambition alignment', enMap);
    expect(evidence.toLowerCase()).not.toContain('alignment');
  });
});
