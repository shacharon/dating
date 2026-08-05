import type { BreakdownEntry } from '../compatibility/compatibility-score';
import {
  bandFromSignalValue,
  buildCompatibilityBreakdown,
  BREAKDOWN_CHALLENGES_FRICTION_MIN,
  matchLevelFromPairScore,
} from './match-compatibility-breakdown';

function entry(
  key: BreakdownEntry['key'],
  self: number,
  partner: number,
  pairScore: number,
): BreakdownEntry {
  return {
    key,
    self,
    partner,
    gap: Math.abs(self - partner),
    pairScore,
  };
}

describe('match-compatibility-breakdown', () => {
  describe('matchLevelFromPairScore / bandFromSignalValue', () => {
    it('maps pairScore bands', () => {
      expect(matchLevelFromPairScore(7)).toBe('high');
      expect(matchLevelFromPairScore(4)).toBe('medium');
      expect(matchLevelFromPairScore(3.9)).toBe('low');
    });

    it('maps signal value bands', () => {
      expect(bandFromSignalValue(1)).toBe('Low');
      expect(bandFromSignalValue(3)).toBe('Low');
      expect(bandFromSignalValue(4)).toBe('Medium');
      expect(bandFromSignalValue(6)).toBe('Medium');
      expect(bandFromSignalValue(7)).toBe('High');
    });
  });

  describe('buildCompatibilityBreakdown', () => {
    const baseBreakdown: BreakdownEntry[] = [
      entry('traditionalism', 8, 8, 9),
      entry('financialMindset', 7, 6, 8),
      entry('relationshipClarity', 5, 5, 7),
      entry('lifestylePace', 4, 8, 3),
      entry('emotionalDepth', 9, 9, 10),
      entry('directness', 6, 7, 8),
      entry('conflictStyle', 3, 8, 2),
      entry('independence', 5, 5, 6),
    ];

    it('builds values from valuesAlignment + top 3 TIER1 by pairScore', () => {
      const dto = buildCompatibilityBreakdown({
        finalScore: 87,
        valuesAlignment: 82.4,
        interestAlignment: 50,
        friction: 1,
        breakdown: baseBreakdown,
        tensionMatrix: [],
        sharedInterests: ['Hiking', 'Cooking'],
      });

      expect(dto.finalScore).toBe(87);
      expect(dto.values.score).toBe(82);
      expect(dto.values.signals.map((s) => s.key)).toEqual([
        'traditionalism',
        'financialMindset',
        'relationshipClarity',
      ]);
      expect(dto.values.signals[0]).toMatchObject({
        label: 'Shared values',
        match: 'high',
        yourBand: 'High',
        theirBand: 'High',
      });
      expect(dto.challenges).toBeUndefined();
    });

    it('builds personality from TIER2 mean×10 and top signals', () => {
      const dto = buildCompatibilityBreakdown({
        finalScore: 80,
        valuesAlignment: 70,
        interestAlignment: 40,
        friction: 0,
        breakdown: baseBreakdown,
        tensionMatrix: [],
      });

      // pairScores: 10, 8, 2, 6 → mean 6.5 → 65
      expect(dto.personality?.score).toBe(65);
      expect(dto.personality?.signals.map((s) => s.key)).toEqual([
        'emotionalDepth',
        'directness',
        'independence',
      ]);
    });

    it('omits personality when no TIER2 entries', () => {
      const dto = buildCompatibilityBreakdown({
        finalScore: 70,
        valuesAlignment: 60,
        interestAlignment: 20,
        friction: 0,
        breakdown: [entry('traditionalism', 8, 8, 9)],
        tensionMatrix: [],
      });
      expect(dto.personality).toBeUndefined();
    });

    it('caps shared interests at 8 and reports full sharedCount', () => {
      const tags = Array.from({ length: 10 }, (_, i) => `Tag${i}`);
      const dto = buildCompatibilityBreakdown({
        finalScore: 70,
        valuesAlignment: 50,
        interestAlignment: 88.2,
        friction: 0,
        breakdown: [],
        tensionMatrix: [],
        sharedInterests: tags,
      });
      expect(dto.interests.score).toBe(88);
      expect(dto.interests.sharedCount).toBe(10);
      expect(dto.interests.shared).toHaveLength(8);
      expect(dto.interests.shared[0]).toBe('Tag0');
    });

    it('includes challenges only when friction >= threshold', () => {
      const matrix = [
        {
          id: 'emotional_depth_gap',
          name: 'Emotional depth gap',
          penalty: 5,
          explain: 'Large gap in emotional depth.',
        },
        {
          id: 'lifestyle_pace_mismatch',
          name: 'Lifestyle pace',
          penalty: 3,
          explain: 'Different pace of life.',
        },
      ];

      const low = buildCompatibilityBreakdown({
        finalScore: 60,
        valuesAlignment: 50,
        interestAlignment: 40,
        friction: BREAKDOWN_CHALLENGES_FRICTION_MIN - 1,
        breakdown: baseBreakdown,
        tensionMatrix: matrix,
      });
      expect(low.challenges).toBeUndefined();

      const high = buildCompatibilityBreakdown({
        finalScore: 60,
        valuesAlignment: 50,
        interestAlignment: 40,
        friction: BREAKDOWN_CHALLENGES_FRICTION_MIN,
        breakdown: baseBreakdown,
        tensionMatrix: matrix,
      });
      expect(high.challenges?.areas).toHaveLength(2);
      expect(high.challenges?.areas[0]).toMatchObject({
        id: 'emotional_depth_gap',
        label: 'Emotional depth gap',
        note: 'Large gap in emotional depth.',
      });
      // No invented challenge %
      expect(
        (high.challenges as { score?: number } | undefined)?.score,
      ).toBeUndefined();
    });

    it('omits challenges when friction high but matrix empty', () => {
      const dto = buildCompatibilityBreakdown({
        finalScore: 55,
        valuesAlignment: 40,
        interestAlignment: 10,
        friction: 5,
        breakdown: [],
        tensionMatrix: [],
      });
      expect(dto.challenges).toBeUndefined();
    });

    it('caps signals and challenges at 3', () => {
      const manyTier: BreakdownEntry[] = [
        entry('traditionalism', 8, 8, 10),
        entry('financialMindset', 8, 8, 9),
        entry('relationshipClarity', 8, 8, 8),
        entry('lifestylePace', 8, 8, 7),
        entry('spirituality', 8, 8, 6),
        entry('attachmentSecurity', 8, 8, 5),
        entry('emotionalDepth', 9, 9, 10),
        entry('independence', 8, 8, 9),
        entry('directness', 7, 7, 8),
        entry('socialBattery', 6, 6, 7),
        entry('conflictStyle', 5, 5, 6),
      ];
      const manyTensions = Array.from({ length: 5 }, (_, i) => ({
        id: `tension_${i}`,
        name: `Tension ${i}`,
        penalty: 10 - i,
        explain: `Note ${i}`,
      }));

      const dto = buildCompatibilityBreakdown({
        finalScore: 70,
        valuesAlignment: 80,
        interestAlignment: 40,
        friction: 4,
        breakdown: manyTier,
        tensionMatrix: manyTensions,
      });

      expect(dto.values.signals).toHaveLength(3);
      expect(dto.values.signals.map((s) => s.key)).toEqual([
        'traditionalism',
        'financialMindset',
        'relationshipClarity',
      ]);
      expect(dto.personality?.signals).toHaveLength(3);
      expect(dto.challenges?.areas).toHaveLength(3);
      expect(dto.challenges?.areas[0].id).toBe('tension_0');
    });
  });
});
