import { applyKeywordTriggers, computeFriction } from './compute-friction';
import type { EnrichedSignals } from './tension-rules';

describe('compute-friction', () => {
  describe('applyKeywordTriggers', () => {
    it('sets fusionNeed to at least 9 when text contains fusion keyword', () => {
      const signals: Record<string, number | null> = {};
      const enriched = applyKeywordTriggers(signals, {
        aboutMe: 'We should be one soul',
        aboutRelationship: '',
      });
      expect(enriched.fusionNeed).toBe(9);
    });

    it('sets boundariesNeed to at least 8 when text contains boundaries keyword', () => {
      const signals: Record<string, number | null> = {};
      const enriched = applyKeywordTriggers(signals, {
        aboutMe: 'I need boundaries in a relationship',
        aboutRelationship: '',
      });
      expect(enriched.boundariesNeed).toBe(8);
    });

    it('respects existing higher signal', () => {
      const enriched = applyKeywordTriggers(
        { fusionNeed: 5, boundariesNeed: 10 } as EnrichedSignals,
        { aboutMe: 'one soul', aboutRelationship: 'needs space' },
      );
      expect(enriched.fusionNeed).toBe(9);
      expect(enriched.boundariesNeed).toBe(10);
    });
  });

  describe('computeFriction', () => {
    it('returns friction 0 and empty tensions when no rules fire', () => {
      const a: EnrichedSignals = { independence: 5, socialBattery: 5 };
      const b: EnrichedSignals = { independence: 5, socialBattery: 5 };
      const result = computeFriction(a, b);
      expect(result.friction).toBe(0);
      expect(result.tensions).toHaveLength(0);
    });

    it('fusionNeed>=7 on A and boundariesNeed>=6 on B fires FUSION vs BOUNDARIES, penalty 7', () => {
      const a: EnrichedSignals = { fusionNeed: 9 };
      const b: EnrichedSignals = { boundariesNeed: 8 };
      const result = computeFriction(a, b);
      expect(result.friction).toBeGreaterThanOrEqual(7);
      expect(result.tensions.some((t) => t.id === 'fusion_vs_boundaries')).toBe(true);
      expect(result.tensions.find((t) => t.id === 'fusion_vs_boundaries')?.penalty).toBe(7);
    });

    it('clamps friction to 10', () => {
      const a: EnrichedSignals = {
        fusionNeed: 9,
        independence: 1,
        attachmentSecurity: 1,
        directness: 9,
        traditionalism: 9,
        lifestylePace: 9,
        socialBattery: 1,
        financialMindset: 1,
        statusOrientation: 1,
        physicalPriority: 10,
      };
      const b: EnrichedSignals = {
        boundariesNeed: 8,
        independence: 9,
        attachmentSecurity: 9,
        directness: 9,
        traditionalism: 9,
        lifestylePace: 9,
        socialBattery: 9,
        financialMindset: 9,
        statusOrientation: 9,
        physicalPriority: 1,
      };
      const result = computeFriction(a, b);
      expect(result.friction).toBeLessThanOrEqual(10);
    });
  });

  describe('Expansion-01 shadow tension rules', () => {
    it('empathy_gap fires when one partner is high empathy and other is low', () => {
      const a: EnrichedSignals = { empathyCompassion: 9 };
      const b: EnrichedSignals = { empathyCompassion: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'empathy_gap');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(4);
      expect(result.friction).toBeGreaterThanOrEqual(4);
    });

    it('empathy_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { empathyCompassion: 2 };
      const b: EnrichedSignals = { empathyCompassion: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'empathy_gap')).toBe(true);
    });

    it('empathy_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { empathyCompassion: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'empathy_gap')).toBe(false);
    });

    it('empathy_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { empathyCompassion: 7 };
      const b: EnrichedSignals = { empathyCompassion: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'empathy_gap')).toBe(false);
    });

    it('vulnerability_mismatch fires when one partner is open and other is guarded', () => {
      const a: EnrichedSignals = { vulnerabilityOpenness: 8 };
      const b: EnrichedSignals = { vulnerabilityOpenness: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'vulnerability_mismatch');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(5);
      expect(result.friction).toBeGreaterThanOrEqual(5);
    });

    it('vulnerability_mismatch does not fire when either side is null', () => {
      const a: EnrichedSignals = { vulnerabilityOpenness: 8 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'vulnerability_mismatch')).toBe(
        false,
      );
    });
  });

  describe('Expansion-02 shadow tension rules', () => {
    it('emotional_volatility_gap fires when one partner is steady and other is reactive', () => {
      const a: EnrichedSignals = { emotionalRegulation: 9 };
      const b: EnrichedSignals = { emotionalRegulation: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'emotional_volatility_gap');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(5);
      expect(result.friction).toBeGreaterThanOrEqual(5);
    });

    it('emotional_volatility_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { emotionalRegulation: 2 };
      const b: EnrichedSignals = { emotionalRegulation: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'emotional_volatility_gap')).toBe(
        true,
      );
    });

    it('emotional_volatility_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { emotionalRegulation: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'emotional_volatility_gap')).toBe(
        false,
      );
    });

    it('emotional_volatility_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { emotionalRegulation: 7 };
      const b: EnrichedSignals = { emotionalRegulation: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'emotional_volatility_gap')).toBe(
        false,
      );
    });

    it('affection_needs_gap fires when one partner needs high touch and other is low', () => {
      const a: EnrichedSignals = { physicalAffectionStyle: 8 };
      const b: EnrichedSignals = { physicalAffectionStyle: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'affection_needs_gap');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(4);
      expect(result.friction).toBeGreaterThanOrEqual(4);
    });

    it('affection_needs_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { physicalAffectionStyle: 3 };
      const b: EnrichedSignals = { physicalAffectionStyle: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'affection_needs_gap')).toBe(true);
    });

    it('affection_needs_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { physicalAffectionStyle: 8 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'affection_needs_gap')).toBe(false);
    });

    it('affection_needs_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { physicalAffectionStyle: 7 };
      const b: EnrichedSignals = { physicalAffectionStyle: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'affection_needs_gap')).toBe(false);
    });
  });

  describe('Expansion-03 shadow tension rules', () => {
    it('humor_mismatch fires when one partner values playfulness and other is serious', () => {
      const a: EnrichedSignals = { humorPlayfulness: 9 };
      const b: EnrichedSignals = { humorPlayfulness: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'humor_mismatch');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(3);
      expect(result.friction).toBeGreaterThanOrEqual(3);
    });

    it('humor_mismatch fires when high/low is reversed', () => {
      const a: EnrichedSignals = { humorPlayfulness: 2 };
      const b: EnrichedSignals = { humorPlayfulness: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'humor_mismatch')).toBe(true);
    });

    it('humor_mismatch does not fire when either side is null', () => {
      const a: EnrichedSignals = { humorPlayfulness: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'humor_mismatch')).toBe(false);
    });

    it('humor_mismatch does not fire below directional threshold', () => {
      const a: EnrichedSignals = { humorPlayfulness: 7 };
      const b: EnrichedSignals = { humorPlayfulness: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'humor_mismatch')).toBe(false);
    });
  });

  describe('Expansion-04 shadow tension rules', () => {
    it('intellectual_gap fires when one needs stimulation and other does not', () => {
      const a: EnrichedSignals = { intellectualCuriosity: 9 };
      const b: EnrichedSignals = { intellectualCuriosity: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'intellectual_gap');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(4);
      expect(result.friction).toBeGreaterThanOrEqual(4);
    });

    it('intellectual_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { intellectualCuriosity: 2 };
      const b: EnrichedSignals = { intellectualCuriosity: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'intellectual_gap')).toBe(true);
    });

    it('intellectual_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { intellectualCuriosity: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'intellectual_gap')).toBe(false);
    });

    it('intellectual_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { intellectualCuriosity: 7 };
      const b: EnrichedSignals = { intellectualCuriosity: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'intellectual_gap')).toBe(false);
    });

    it('creative_mismatch fires when one needs creative expression and other does not', () => {
      const a: EnrichedSignals = { creativeExpression: 9 };
      const b: EnrichedSignals = { creativeExpression: 1 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'creative_mismatch');
      expect(rule).toBeDefined();
      expect(rule?.penalty).toBe(2);
      expect(result.friction).toBeGreaterThanOrEqual(2);
    });

    it('creative_mismatch fires when high/low is reversed', () => {
      const a: EnrichedSignals = { creativeExpression: 1 };
      const b: EnrichedSignals = { creativeExpression: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'creative_mismatch')).toBe(true);
    });

    it('creative_mismatch does not fire when either side is null', () => {
      const a: EnrichedSignals = { creativeExpression: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'creative_mismatch')).toBe(false);
    });

    it('creative_mismatch does not fire when low side is 3 (must be <= 2)', () => {
      const a: EnrichedSignals = { creativeExpression: 8 };
      const b: EnrichedSignals = { creativeExpression: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'creative_mismatch')).toBe(false);
    });

    it('creative_mismatch fires at low-band boundary (<= 2)', () => {
      const a: EnrichedSignals = { creativeExpression: 8 };
      const b: EnrichedSignals = { creativeExpression: 2 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'creative_mismatch')).toBe(true);
    });
  });

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

  describe('Expansion-10 shadow tension rules', () => {
    it('repair_skills_gap fires when repair skills diverge', () => {
      const a: EnrichedSignals = { repairSkills: 9 };
      const b: EnrichedSignals = { repairSkills: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'repair_skills_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(5);
    });

    it('repair_skills_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { repairSkills: 2 };
      const b: EnrichedSignals = { repairSkills: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'repair_skills_gap')).toBe(
        true,
      );
    });

    it('repair_skills_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { repairSkills: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'repair_skills_gap')).toBe(
        false,
      );
    });

    it('repair_skills_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { repairSkills: 7 };
      const b: EnrichedSignals = { repairSkills: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'repair_skills_gap')).toBe(
        false,
      );
    });

    it('repair_skills_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { repairSkills: 8 };
      const b: EnrichedSignals = { repairSkills: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'repair_skills_gap')).toBe(
        true,
      );
    });

    it('both_low_repair fires when both repair skills are low', () => {
      const a: EnrichedSignals = { repairSkills: 2 };
      const b: EnrichedSignals = { repairSkills: 3 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'both_low_repair');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(6);
    });

    it('both_low_repair fires at boundary (both <= 3)', () => {
      const a: EnrichedSignals = { repairSkills: 3 };
      const b: EnrichedSignals = { repairSkills: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_low_repair')).toBe(true);
    });

    it('both_low_repair does not fire when either side is null', () => {
      const a: EnrichedSignals = { repairSkills: 2 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_low_repair')).toBe(
        false,
      );
    });

    it('both_low_repair does not fire when one side is above low band', () => {
      const a: EnrichedSignals = { repairSkills: 3 };
      const b: EnrichedSignals = { repairSkills: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_low_repair')).toBe(
        false,
      );
    });

    it('both_low_repair fires without repair_skills_gap when both are low', () => {
      const a: EnrichedSignals = { repairSkills: 2 };
      const b: EnrichedSignals = { repairSkills: 2 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_low_repair')).toBe(true);
      expect(result.tensions.some((t) => t.id === 'repair_skills_gap')).toBe(
        false,
      );
    });

    it('forgiveness_style_gap fires when forgiveness pace diverges', () => {
      const a: EnrichedSignals = { forgivenessStyle: 9 };
      const b: EnrichedSignals = { forgivenessStyle: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'forgiveness_style_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('forgiveness_style_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { forgivenessStyle: 2 };
      const b: EnrichedSignals = { forgivenessStyle: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'forgiveness_style_gap'),
      ).toBe(true);
    });

    it('forgiveness_style_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { forgivenessStyle: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'forgiveness_style_gap'),
      ).toBe(false);
    });

    it('forgiveness_style_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { forgivenessStyle: 7 };
      const b: EnrichedSignals = { forgivenessStyle: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'forgiveness_style_gap'),
      ).toBe(false);
    });

    it('forgiveness_style_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { forgivenessStyle: 8 };
      const b: EnrichedSignals = { forgivenessStyle: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'forgiveness_style_gap'),
      ).toBe(true);
    });
  });

  describe('Expansion-11 shadow tension rules', () => {
    it('stress_response_clash fires when stress directions diverge', () => {
      const a: EnrichedSignals = { stressResponse: 9 };
      const b: EnrichedSignals = { stressResponse: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'stress_response_clash');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(5);
    });

    it('stress_response_clash fires when high/low is reversed', () => {
      const a: EnrichedSignals = { stressResponse: 2 };
      const b: EnrichedSignals = { stressResponse: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'stress_response_clash'),
      ).toBe(true);
    });

    it('stress_response_clash does not fire when either side is null', () => {
      const a: EnrichedSignals = { stressResponse: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'stress_response_clash'),
      ).toBe(false);
    });

    it('stress_response_clash does not fire below directional threshold', () => {
      const a: EnrichedSignals = { stressResponse: 7 };
      const b: EnrichedSignals = { stressResponse: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'stress_response_clash'),
      ).toBe(false);
    });

    it('stress_response_clash fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { stressResponse: 8 };
      const b: EnrichedSignals = { stressResponse: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'stress_response_clash'),
      ).toBe(true);
    });

    it('jealousy_security_gap fires when jealousy levels diverge', () => {
      const a: EnrichedSignals = { jealousySecurity: 9 };
      const b: EnrichedSignals = { jealousySecurity: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'jealousy_security_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(5);
    });

    it('jealousy_security_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { jealousySecurity: 2 };
      const b: EnrichedSignals = { jealousySecurity: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'jealousy_security_gap'),
      ).toBe(true);
    });

    it('jealousy_security_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { jealousySecurity: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'jealousy_security_gap'),
      ).toBe(false);
    });

    it('jealousy_security_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { jealousySecurity: 7 };
      const b: EnrichedSignals = { jealousySecurity: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'jealousy_security_gap'),
      ).toBe(false);
    });

    it('jealousy_security_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { jealousySecurity: 8 };
      const b: EnrichedSignals = { jealousySecurity: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'jealousy_security_gap'),
      ).toBe(true);
    });

    it('both_high_jealousy fires when both jealousy scores are high', () => {
      const a: EnrichedSignals = { jealousySecurity: 8 };
      const b: EnrichedSignals = { jealousySecurity: 9 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'both_high_jealousy');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(3);
    });

    it('both_high_jealousy fires at boundary (both >= 8)', () => {
      const a: EnrichedSignals = { jealousySecurity: 8 };
      const b: EnrichedSignals = { jealousySecurity: 8 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_high_jealousy')).toBe(
        true,
      );
    });

    it('both_high_jealousy does not fire when either side is null', () => {
      const a: EnrichedSignals = { jealousySecurity: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_high_jealousy')).toBe(
        false,
      );
    });

    it('both_high_jealousy does not fire when one side is below high band', () => {
      const a: EnrichedSignals = { jealousySecurity: 8 };
      const b: EnrichedSignals = { jealousySecurity: 7 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_high_jealousy')).toBe(
        false,
      );
    });

    it('both_high_jealousy fires without jealousy_security_gap when both are high', () => {
      const a: EnrichedSignals = { jealousySecurity: 9 };
      const b: EnrichedSignals = { jealousySecurity: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'both_high_jealousy')).toBe(
        true,
      );
      expect(
        result.tensions.some((t) => t.id === 'jealousy_security_gap'),
      ).toBe(false);
    });
  });
});
