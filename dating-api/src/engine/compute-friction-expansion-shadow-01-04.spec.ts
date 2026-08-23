import { computeFriction } from './compute-friction';
import type { EnrichedSignals } from './tension-rules';

describe('compute-friction expansion shadow (01-04)', () => {
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

});
