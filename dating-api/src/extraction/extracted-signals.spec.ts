import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { KEY_ALIASES } from './extraction-normalization';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from './extraction-strict-validation';
import {
  EXPANSION_07_PROMOTION_CHIP_LABELS,
  EXPANSION_07_PROMOTION_DOMAINS,
  EXPANSION_07_PROMOTION_WEIGHTS,
  EXPANSION_07_SHADOW_SIGNAL_KEYS,
} from './expansion-07-signal-definitions';
import {
  EXPANSION_08_PROMOTION_CHIP_LABELS,
  EXPANSION_08_PROMOTION_DOMAINS,
  EXPANSION_08_PROMOTION_TIERS,
  EXPANSION_08_PROMOTION_WEIGHTS,
  EXPANSION_08_SHADOW_SIGNAL_KEYS,
} from './expansion-08-signal-definitions';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS_SET,
} from './extracted-signals.interface';

describe('extracted-signals shape', () => {
  describe('SHADOW_SIGNAL_KEYS', () => {
    it('includes the remaining original shadow keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('intellectualCuriosity');
      expect(SHADOW_SIGNAL_KEYS).toContain('structureChaosTolerance');
    });

    it('includes Expansion-06 adventureNovelty (renamed from noveltyVsRoutine)', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('adventureNovelty');
      expect(SHADOW_SIGNAL_KEYS).not.toContain('noveltyVsRoutine');
    });

    it('does not include conflictStyle (promoted to official in sprint 21)', () => {
      expect(SHADOW_SIGNAL_KEYS).not.toContain('conflictStyle');
    });

    it('includes the four Phase A expansion keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('emotionalAvailability');
      expect(SHADOW_SIGNAL_KEYS).toContain('emotionalSafety');
      expect(SHADOW_SIGNAL_KEYS).toContain('commitmentIntentDepth');
      expect(SHADOW_SIGNAL_KEYS).toContain('practicalLifeReadiness');
    });

    it('includes Expansion-01 empathy & vulnerability keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('empathyCompassion');
      expect(SHADOW_SIGNAL_KEYS).toContain('vulnerabilityOpenness');
    });

    it('includes Expansion-02 regulation & affection keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('emotionalRegulation');
      expect(SHADOW_SIGNAL_KEYS).toContain('physicalAffectionStyle');
    });

    it('includes Expansion-03 humor & playfulness key', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('humorPlayfulness');
    });

    it('includes Expansion-04 creative expression key', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('creativeExpression');
    });

    it('includes Expansion-05 activity & domestic keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('physicalActivityLevel');
      expect(SHADOW_SIGNAL_KEYS).toContain('domesticComfort');
    });

    it('includes Expansion-07 profile-gap keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('casualIntimacyIntent');
      expect(SHADOW_SIGNAL_KEYS).toContain('supportExchangeOrientation');
      expect(SHADOW_SIGNAL_KEYS).toContain('supportProviderOrientation');
      expect(SHADOW_SIGNAL_KEYS).toContain('supportRecipientOrientation');
      expect(SHADOW_SIGNAL_KEYS).toContain('religiousObservance');
    });

    it('includes Expansion-08 education/integrity/lifestyle keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('educationLevel');
      expect(SHADOW_SIGNAL_KEYS).toContain('honestyIntegrity');
      expect(SHADOW_SIGNAL_KEYS).toContain('chronotype');
      expect(SHADOW_SIGNAL_KEYS).toContain('physicalTypePreference');
    });

    it('contains exactly 24 keys', () => {
      expect(SHADOW_SIGNAL_KEYS.length).toBe(24);
    });
  });

  describe('SHADOW_SIGNAL_KEYS_SET', () => {
    it('provides O(1) lookup for new shadow keys', () => {
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalAvailability')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalSafety')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('commitmentIntentDepth')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('practicalLifeReadiness')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('empathyCompassion')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('vulnerabilityOpenness')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalRegulation')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('physicalAffectionStyle')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('humorPlayfulness')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('creativeExpression')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('physicalActivityLevel')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('domesticComfort')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('adventureNovelty')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('noveltyVsRoutine')).toBe(false);
      expect(SHADOW_SIGNAL_KEYS_SET.has('casualIntimacyIntent')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('supportExchangeOrientation')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('supportProviderOrientation')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('supportRecipientOrientation')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('religiousObservance')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('educationLevel')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('honestyIntegrity')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('chronotype')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('physicalTypePreference')).toBe(true);
    });

    it('does not include official keys', () => {
      expect(SHADOW_SIGNAL_KEYS_SET.has('ambition')).toBe(false);
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalDepth')).toBe(false);
    });
  });

  describe('EXTRACTION_SIGNAL_KEYS', () => {
    it('is the union of official + shadow keys', () => {
      const allKeys = new Set(EXTRACTION_SIGNAL_KEYS);
      for (const k of OFFICIAL_EXTRACTION_SIGNAL_KEYS) {
        expect(allKeys.has(k)).toBe(true);
      }
      for (const k of SHADOW_SIGNAL_KEYS) {
        expect(allKeys.has(k)).toBe(true);
      }
    });

    it('total count equals 15 official + 24 shadow', () => {
      expect(EXTRACTION_SIGNAL_KEYS.length).toBe(
        OFFICIAL_EXTRACTION_SIGNAL_KEYS.length + SHADOW_SIGNAL_KEYS.length,
      );
      expect(EXTRACTION_SIGNAL_KEYS.length).toBe(39);
    });
  });

  describe('MAX_EVIDENCE_ITEMS', () => {
    it('is at least as large as total signal key count with buffer', () => {
      expect(MAX_EVIDENCE_ITEMS).toBeGreaterThanOrEqual(
        EXTRACTION_SIGNAL_KEYS.length,
      );
    });

    it('equals 43 (15 official + 24 shadow + 4 buffer)', () => {
      expect(MAX_EVIDENCE_ITEMS).toBe(43);
    });
  });

  describe('no overlap between official and shadow keys', () => {
    it('no key appears in both lists', () => {
      const officialSet = new Set(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of SHADOW_SIGNAL_KEYS) {
        expect(officialSet.has(k)).toBe(false);
      }
    });
  });

  describe('Expansion-01 shadow mode (no scoring wire-up)', () => {
    const expansion01Keys = [
      'empathyCompassion',
      'vulnerabilityOpenness',
    ] as const;

    it('keeps Expansion-01 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion01Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-01 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion01Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });
  });

  describe('Expansion-02 shadow mode (no scoring wire-up)', () => {
    const expansion02Keys = [
      'emotionalRegulation',
      'physicalAffectionStyle',
    ] as const;

    it('keeps Expansion-02 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion02Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-02 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion02Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });
  });

  describe('Expansion-03 shadow mode (no scoring wire-up)', () => {
    const expansion03Keys = ['humorPlayfulness'] as const;

    it('keeps Expansion-03 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion03Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-03 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion03Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });
  });

  describe('Expansion-04 shadow mode (no scoring wire-up)', () => {
    const expansion04Keys = [
      'intellectualCuriosity',
      'creativeExpression',
    ] as const;

    it('keeps Expansion-04 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion04Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-04 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion04Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });
  });

  describe('Expansion-05 shadow mode (no scoring wire-up)', () => {
    const expansion05Keys = [
      'physicalActivityLevel',
      'domesticComfort',
    ] as const;

    it('keeps Expansion-05 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion05Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-05 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion05Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });
  });

  describe('Expansion-06 shadow mode (no scoring wire-up)', () => {
    const expansion06Keys = ['adventureNovelty'] as const;

    it('keeps Expansion-06 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion06Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-06 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion06Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });

    it('aliases noveltyVsRoutine into adventureNovelty', () => {
      expect(KEY_ALIASES.noveltyVsRoutine).toBe('adventureNovelty');
    });

    it('allows adventureNovelty on self domain (not legacy noveltyVsRoutine)', () => {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain('adventureNovelty');
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).not.toContain('noveltyVsRoutine');
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(31);
    });
  });

  describe('Expansion-07 shadow mode (no scoring wire-up)', () => {
    const expansion07Keys = [
      'casualIntimacyIntent',
      'supportExchangeOrientation',
      'supportProviderOrientation',
      'supportRecipientOrientation',
      'religiousObservance',
    ] as const;

    it('keeps Expansion-07 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion07Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-07 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion07Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });

    it('allows Expansion-07 keys on self and partner domains', () => {
      for (const k of expansion07Keys) {
        expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
        expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
        expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
      }
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(31);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(17);
    });

    it('exposes promotion-ready metadata for all five keys', () => {
      expect(EXPANSION_07_SHADOW_SIGNAL_KEYS).toEqual([...expansion07Keys]);
      expect(EXPANSION_07_SHADOW_SIGNAL_KEYS.length).toBe(5);
      expect(EXPANSION_07_PROMOTION_WEIGHTS.casualIntimacyIntent).toBe(1.4);
      expect(EXPANSION_07_PROMOTION_WEIGHTS.supportExchangeOrientation).toBe(1.5);
      expect(EXPANSION_07_PROMOTION_WEIGHTS.supportProviderOrientation).toBe(1.3);
      expect(EXPANSION_07_PROMOTION_WEIGHTS.supportRecipientOrientation).toBe(1.3);
      expect(EXPANSION_07_PROMOTION_WEIGHTS.religiousObservance).toBe(1.5);
      expect(EXPANSION_07_PROMOTION_DOMAINS.casualIntimacyIntent).toBe('intimacy');
      expect(EXPANSION_07_PROMOTION_DOMAINS.supportExchangeOrientation).toBe(
        'relationship',
      );
      expect(EXPANSION_07_PROMOTION_DOMAINS.religiousObservance).toBe('values');
      expect(EXPANSION_07_PROMOTION_CHIP_LABELS.casualIntimacyIntent).toBe(
        'Intimacy expectations',
      );
      expect(EXPANSION_07_PROMOTION_CHIP_LABELS.supportExchangeOrientation).toBe(
        'Support & arrangement style',
      );
      expect(EXPANSION_07_PROMOTION_CHIP_LABELS.religiousObservance).toBe(
        'Religious practice',
      );
    });
  });

  describe('Expansion-08 shadow mode (no scoring wire-up)', () => {
    const expansion08Keys = [
      'educationLevel',
      'honestyIntegrity',
      'chronotype',
      'physicalTypePreference',
    ] as const;

    it('keeps Expansion-08 keys out of official extraction', () => {
      const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of expansion08Keys) {
        expect(official.has(k)).toBe(false);
      }
    });

    it('keeps Expansion-08 keys out of compatibility scoring keys', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      for (const k of expansion08Keys) {
        expect(scored.has(k)).toBe(false);
      }
    });

    it('allows Expansion-08 keys on self and partner domains', () => {
      for (const k of expansion08Keys) {
        expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
        expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
        expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
      }
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(31);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(17);
    });

    it('exposes promotion-ready metadata for all four keys', () => {
      expect(EXPANSION_08_SHADOW_SIGNAL_KEYS).toEqual([...expansion08Keys]);
      expect(EXPANSION_08_SHADOW_SIGNAL_KEYS.length).toBe(4);
      expect(EXPANSION_08_PROMOTION_WEIGHTS.educationLevel).toBe(1.3);
      expect(EXPANSION_08_PROMOTION_WEIGHTS.honestyIntegrity).toBe(1.4);
      expect(EXPANSION_08_PROMOTION_WEIGHTS.chronotype).toBe(1.1);
      expect(EXPANSION_08_PROMOTION_WEIGHTS.physicalTypePreference).toBe(1.2);
      expect(EXPANSION_08_PROMOTION_TIERS.educationLevel).toBe(1);
      expect(EXPANSION_08_PROMOTION_TIERS.honestyIntegrity).toBe(1);
      expect(EXPANSION_08_PROMOTION_TIERS.chronotype).toBe(3);
      expect(EXPANSION_08_PROMOTION_TIERS.physicalTypePreference).toBe(3);
      expect(EXPANSION_08_PROMOTION_DOMAINS.educationLevel).toBe('values');
      expect(EXPANSION_08_PROMOTION_DOMAINS.honestyIntegrity).toBe('values');
      expect(EXPANSION_08_PROMOTION_DOMAINS.chronotype).toBe('lifestyle');
      expect(EXPANSION_08_PROMOTION_DOMAINS.physicalTypePreference).toBe(
        'lifestyle',
      );
      expect(EXPANSION_08_PROMOTION_CHIP_LABELS.educationLevel).toBe(
        'Education alignment',
      );
      expect(EXPANSION_08_PROMOTION_CHIP_LABELS.honestyIntegrity).toBe(
        'Honesty & integrity',
      );
      expect(EXPANSION_08_PROMOTION_CHIP_LABELS.chronotype).toBe(
        'Sleep & energy rhythm',
      );
      expect(EXPANSION_08_PROMOTION_CHIP_LABELS.physicalTypePreference).toBe(
        'Physical type fit',
      );
    });
  });
});
