import { computeFriction } from './compute-friction';
import type { EnrichedSignals } from './tension-rules';

describe('compute-friction expansion shadow (05-09)', () => {
  describe('Expansion-05 shadow tension rules', () => {
    it('activity_level_gap fires when activity levels diverge', () => {
      const a: EnrichedSignals = { physicalActivityLevel: 9 };
      const b: EnrichedSignals = { physicalActivityLevel: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'activity_level_gap');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(3);
      expect(result.friction).toBeGreaterThanOrEqual(3);
    });

    it('activity_level_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { physicalActivityLevel: 2 };
      const b: EnrichedSignals = { physicalActivityLevel: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'activity_level_gap')).toBe(true);
    });

    it('activity_level_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { physicalActivityLevel: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'activity_level_gap')).toBe(false);
    });

    it('activity_level_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { physicalActivityLevel: 7 };
      const b: EnrichedSignals = { physicalActivityLevel: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'activity_level_gap')).toBe(false);
    });

    it('domestic_out_mismatch fires when home vs out preferences diverge', () => {
      const a: EnrichedSignals = { domesticComfort: 9 };
      const b: EnrichedSignals = { domesticComfort: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'domestic_out_mismatch');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(3);
      expect(result.friction).toBeGreaterThanOrEqual(3);
    });

    it('domestic_out_mismatch fires when high/low is reversed', () => {
      const a: EnrichedSignals = { domesticComfort: 2 };
      const b: EnrichedSignals = { domesticComfort: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'domestic_out_mismatch')).toBe(
        true,
      );
    });

    it('domestic_out_mismatch does not fire when either side is null', () => {
      const a: EnrichedSignals = { domesticComfort: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'domestic_out_mismatch')).toBe(
        false,
      );
    });

    it('domestic_out_mismatch does not fire below directional threshold', () => {
      const a: EnrichedSignals = { domesticComfort: 7 };
      const b: EnrichedSignals = { domesticComfort: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'domestic_out_mismatch')).toBe(
        false,
      );
    });

    it('domestic_out_mismatch fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { domesticComfort: 8 };
      const b: EnrichedSignals = { domesticComfort: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'domestic_out_mismatch')).toBe(
        true,
      );
    });
  });

  describe('Expansion-06 shadow tension rules', () => {
    it('novelty_routine_clash fires when novelty preferences diverge', () => {
      const a: EnrichedSignals = { adventureNovelty: 9 };
      const b: EnrichedSignals = { adventureNovelty: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'novelty_routine_clash');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('novelty_routine_clash fires when high/low is reversed', () => {
      const a: EnrichedSignals = { adventureNovelty: 2 };
      const b: EnrichedSignals = { adventureNovelty: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'novelty_routine_clash')).toBe(
        true,
      );
    });

    it('novelty_routine_clash does not fire when either side is null', () => {
      const a: EnrichedSignals = { adventureNovelty: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'novelty_routine_clash')).toBe(
        false,
      );
    });

    it('novelty_routine_clash does not fire below directional threshold', () => {
      const a: EnrichedSignals = { adventureNovelty: 7 };
      const b: EnrichedSignals = { adventureNovelty: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'novelty_routine_clash')).toBe(
        false,
      );
    });

    it('novelty_routine_clash fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { adventureNovelty: 8 };
      const b: EnrichedSignals = { adventureNovelty: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'novelty_routine_clash')).toBe(
        true,
      );
    });
  });

  describe('Expansion-07 shadow tension rules', () => {
    it('casual_intimacy_clash fires when intimacy stances diverge', () => {
      const a: EnrichedSignals = { casualIntimacyIntent: 9 };
      const b: EnrichedSignals = { casualIntimacyIntent: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'casual_intimacy_clash');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(6);
    });

    it('casual_intimacy_clash fires when high/low is reversed', () => {
      const a: EnrichedSignals = { casualIntimacyIntent: 2 };
      const b: EnrichedSignals = { casualIntimacyIntent: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'casual_intimacy_clash')).toBe(
        true,
      );
    });

    it('casual_intimacy_clash does not fire when either side is null', () => {
      const a: EnrichedSignals = { casualIntimacyIntent: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'casual_intimacy_clash')).toBe(
        false,
      );
    });

    it('casual_intimacy_clash does not fire below directional threshold', () => {
      const a: EnrichedSignals = { casualIntimacyIntent: 7 };
      const b: EnrichedSignals = { casualIntimacyIntent: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'casual_intimacy_clash')).toBe(
        false,
      );
    });

    it('casual_intimacy_clash fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { casualIntimacyIntent: 8 };
      const b: EnrichedSignals = { casualIntimacyIntent: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'casual_intimacy_clash')).toBe(
        true,
      );
    });

    it('support_exchange_mismatch fires when exchange openness diverges', () => {
      const a: EnrichedSignals = { supportExchangeOrientation: 9 };
      const b: EnrichedSignals = { supportExchangeOrientation: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'support_exchange_mismatch',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(6);
    });

    it('support_exchange_mismatch does not fire when either side is null', () => {
      const a: EnrichedSignals = { supportExchangeOrientation: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'support_exchange_mismatch'),
      ).toBe(false);
    });

    it('support_exchange_mismatch does not fire below directional threshold', () => {
      const a: EnrichedSignals = { supportExchangeOrientation: 7 };
      const b: EnrichedSignals = { supportExchangeOrientation: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'support_exchange_mismatch'),
      ).toBe(false);
    });

    it('support_both_provider fires when both open to exchange and both high provider', () => {
      const a: EnrichedSignals = {
        supportExchangeOrientation: 8,
        supportProviderOrientation: 8,
      };
      const b: EnrichedSignals = {
        supportExchangeOrientation: 8,
        supportProviderOrientation: 8,
      };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'support_both_provider');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('support_both_provider does not fire when exchange openness is mid', () => {
      const a: EnrichedSignals = {
        supportExchangeOrientation: 5,
        supportProviderOrientation: 9,
      };
      const b: EnrichedSignals = {
        supportExchangeOrientation: 5,
        supportProviderOrientation: 9,
      };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'support_both_provider')).toBe(
        false,
      );
    });

    it('support_both_provider does not fire when provider is null', () => {
      const a: EnrichedSignals = {
        supportExchangeOrientation: 8,
        supportProviderOrientation: 9,
      };
      const b: EnrichedSignals = { supportExchangeOrientation: 8 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'support_both_provider')).toBe(
        false,
      );
    });

    it('support_both_recipient fires when both open to exchange and both high recipient', () => {
      const a: EnrichedSignals = {
        supportExchangeOrientation: 8,
        supportRecipientOrientation: 8,
      };
      const b: EnrichedSignals = {
        supportExchangeOrientation: 8,
        supportRecipientOrientation: 8,
      };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'support_both_recipient');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('support_both_recipient does not fire when exchange openness is mid', () => {
      const a: EnrichedSignals = {
        supportExchangeOrientation: 5,
        supportRecipientOrientation: 9,
      };
      const b: EnrichedSignals = {
        supportExchangeOrientation: 5,
        supportRecipientOrientation: 9,
      };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'support_both_recipient'),
      ).toBe(false);
    });

    it('religious_observance_gap fires when practice levels diverge sharply', () => {
      const a: EnrichedSignals = { religiousObservance: 9 };
      const b: EnrichedSignals = { religiousObservance: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'religious_observance_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(5);
    });

    it('religious_observance_gap fires at gap exactly 6 with one side >= 7', () => {
      const a: EnrichedSignals = { religiousObservance: 8 };
      const b: EnrichedSignals = { religiousObservance: 2 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'religious_observance_gap'),
      ).toBe(true);
    });

    it('religious_observance_gap does not fire when gap is 5', () => {
      const a: EnrichedSignals = { religiousObservance: 9 };
      const b: EnrichedSignals = { religiousObservance: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'religious_observance_gap'),
      ).toBe(false);
    });

    it('religious_observance_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { religiousObservance: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'religious_observance_gap'),
      ).toBe(false);
    });
  });

  describe('Expansion-08 shadow tension rules', () => {
    it('education_level_gap fires when education priorities diverge', () => {
      const a: EnrichedSignals = { educationLevel: 9 };
      const b: EnrichedSignals = { educationLevel: 3 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'education_level_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('education_level_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { educationLevel: 3 };
      const b: EnrichedSignals = { educationLevel: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'education_level_gap')).toBe(
        true,
      );
    });

    it('education_level_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { educationLevel: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'education_level_gap')).toBe(
        false,
      );
    });

    it('education_level_gap fires at gap exactly 5 with one side >= 8', () => {
      const a: EnrichedSignals = { educationLevel: 8 };
      const b: EnrichedSignals = { educationLevel: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'education_level_gap')).toBe(
        true,
      );
    });

    it('education_level_gap does not fire when gap is 4', () => {
      const a: EnrichedSignals = { educationLevel: 8 };
      const b: EnrichedSignals = { educationLevel: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'education_level_gap')).toBe(
        false,
      );
    });

    it('education_level_gap does not fire when neither side is >= 8', () => {
      const a: EnrichedSignals = { educationLevel: 7 };
      const b: EnrichedSignals = { educationLevel: 2 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'education_level_gap')).toBe(
        false,
      );
    });

    it('honesty_integrity_gap fires when honesty emphasis diverges', () => {
      const a: EnrichedSignals = { honestyIntegrity: 9 };
      const b: EnrichedSignals = { honestyIntegrity: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'honesty_integrity_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(5);
    });

    it('honesty_integrity_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { honestyIntegrity: 2 };
      const b: EnrichedSignals = { honestyIntegrity: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'honesty_integrity_gap'),
      ).toBe(true);
    });

    it('honesty_integrity_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { honestyIntegrity: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'honesty_integrity_gap'),
      ).toBe(false);
    });

    it('honesty_integrity_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { honestyIntegrity: 7 };
      const b: EnrichedSignals = { honestyIntegrity: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'honesty_integrity_gap'),
      ).toBe(false);
    });

    it('honesty_integrity_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { honestyIntegrity: 8 };
      const b: EnrichedSignals = { honestyIntegrity: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'honesty_integrity_gap'),
      ).toBe(true);
    });

    it('chronotype_clash fires when sleep rhythms diverge', () => {
      const a: EnrichedSignals = { chronotype: 9 };
      const b: EnrichedSignals = { chronotype: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'chronotype_clash');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(3);
    });

    it('chronotype_clash fires when high/low is reversed', () => {
      const a: EnrichedSignals = { chronotype: 2 };
      const b: EnrichedSignals = { chronotype: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'chronotype_clash')).toBe(
        true,
      );
    });

    it('chronotype_clash does not fire when either side is null', () => {
      const a: EnrichedSignals = { chronotype: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'chronotype_clash')).toBe(
        false,
      );
    });

    it('chronotype_clash does not fire below directional threshold', () => {
      const a: EnrichedSignals = { chronotype: 7 };
      const b: EnrichedSignals = { chronotype: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'chronotype_clash')).toBe(
        false,
      );
    });

    it('chronotype_clash fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { chronotype: 8 };
      const b: EnrichedSignals = { chronotype: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'chronotype_clash')).toBe(
        true,
      );
    });

    it('physical_type_specificity_clash is soft-skipped (no rule without categories)', () => {
      const a: EnrichedSignals = { physicalTypePreference: 9 };
      const b: EnrichedSignals = { physicalTypePreference: 2 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'physical_type_specificity_clash'),
      ).toBe(false);
    });
  });

});
