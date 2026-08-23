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
});
