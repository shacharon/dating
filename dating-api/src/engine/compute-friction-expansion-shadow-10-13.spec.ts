import { computeFriction } from './compute-friction';
import type { EnrichedSignals } from './tension-rules';

describe('compute-friction expansion shadow (10-13)', () => {
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

  describe('Expansion-12 shadow tension rules', () => {
    it('listening_presence_gap fires when listening levels diverge', () => {
      const a: EnrichedSignals = { listeningPresence: 9 };
      const b: EnrichedSignals = { listeningPresence: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'listening_presence_gap',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('listening_presence_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { listeningPresence: 2 };
      const b: EnrichedSignals = { listeningPresence: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'listening_presence_gap'),
      ).toBe(true);
    });

    it('listening_presence_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { listeningPresence: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'listening_presence_gap'),
      ).toBe(false);
    });

    it('listening_presence_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { listeningPresence: 7 };
      const b: EnrichedSignals = { listeningPresence: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'listening_presence_gap'),
      ).toBe(false);
    });

    it('listening_presence_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { listeningPresence: 8 };
      const b: EnrichedSignals = { listeningPresence: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'listening_presence_gap'),
      ).toBe(true);
    });

    it('emotional_expression_gap fires when expression levels diverge', () => {
      const a: EnrichedSignals = { emotionalExpression: 9 };
      const b: EnrichedSignals = { emotionalExpression: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'emotional_expression_gap',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('emotional_expression_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { emotionalExpression: 2 };
      const b: EnrichedSignals = { emotionalExpression: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'emotional_expression_gap'),
      ).toBe(true);
    });

    it('emotional_expression_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { emotionalExpression: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'emotional_expression_gap'),
      ).toBe(false);
    });

    it('emotional_expression_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { emotionalExpression: 7 };
      const b: EnrichedSignals = { emotionalExpression: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'emotional_expression_gap'),
      ).toBe(false);
    });

    it('emotional_expression_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { emotionalExpression: 8 };
      const b: EnrichedSignals = { emotionalExpression: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'emotional_expression_gap'),
      ).toBe(true);
    });
  });

  describe('Expansion-13 shadow tension rules', () => {
    it('growth_mindset_gap fires when growth levels diverge', () => {
      const a: EnrichedSignals = { growthMindset: 9 };
      const b: EnrichedSignals = { growthMindset: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'growth_mindset_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('growth_mindset_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { growthMindset: 2 };
      const b: EnrichedSignals = { growthMindset: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'growth_mindset_gap'),
      ).toBe(true);
    });

    it('growth_mindset_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { growthMindset: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'growth_mindset_gap'),
      ).toBe(false);
    });

    it('growth_mindset_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { growthMindset: 7 };
      const b: EnrichedSignals = { growthMindset: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'growth_mindset_gap'),
      ).toBe(false);
    });

    it('growth_mindset_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { growthMindset: 8 };
      const b: EnrichedSignals = { growthMindset: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'growth_mindset_gap'),
      ).toBe(true);
    });

    it('both_low_self_awareness fires when both are low', () => {
      const a: EnrichedSignals = { selfAwareness: 2 };
      const b: EnrichedSignals = { selfAwareness: 3 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'both_low_self_awareness',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(3);
    });

    it('both_low_self_awareness does not fire when either side is null', () => {
      const a: EnrichedSignals = { selfAwareness: 2 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'both_low_self_awareness'),
      ).toBe(false);
    });

    it('both_low_self_awareness does not fire when only one is low', () => {
      const a: EnrichedSignals = { selfAwareness: 2 };
      const b: EnrichedSignals = { selfAwareness: 5 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'both_low_self_awareness'),
      ).toBe(false);
    });

    it('both_low_self_awareness does not fire when both are mid', () => {
      const a: EnrichedSignals = { selfAwareness: 5 };
      const b: EnrichedSignals = { selfAwareness: 5 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'both_low_self_awareness'),
      ).toBe(false);
    });

    it('both_low_self_awareness fires at boundary (both <= 3)', () => {
      const a: EnrichedSignals = { selfAwareness: 3 };
      const b: EnrichedSignals = { selfAwareness: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'both_low_self_awareness'),
      ).toBe(true);
    });

    it('does not invent self_awareness_gap for high vs low', () => {
      const a: EnrichedSignals = { selfAwareness: 9 };
      const b: EnrichedSignals = { selfAwareness: 2 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'self_awareness_gap'),
      ).toBe(false);
      expect(
        result.tensions.some((t) => t.id === 'both_low_self_awareness'),
      ).toBe(false);
    });
  });

});
