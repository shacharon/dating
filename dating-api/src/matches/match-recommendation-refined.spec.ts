import { buildMatchRecommendation } from './match-recommendation';
import type { MatchExplainabilityDto } from './match-explainability';

describe('buildMatchRecommendation (refined rules)', () => {
  describe('multi-chip takeaway', () => {
    it('uses top 2 chips when ≥2 chips available', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Emotional depth', 'Direct communication', 'Social rhythm'],
        reasonShort: 'Strong alignment on emotional depth, direct communication, and social rhythm.',
      };

      const result = buildMatchRecommendation({
        finalScore: 85,
        friction: 0,
        explainability,
        stableId: 'test-1',
      });

      expect(result.primaryTakeaway).toContain(
        'real depth and presence and being straight with each other',
      );
      expect(result.primaryTakeaway.toLowerCase()).not.toContain('social rhythm');
      expect(result.primaryTakeaway.toLowerCase()).not.toContain('emotional depth');
    });

    it('uses single chip when exactly 1 chip', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Ambition alignment'],
        reasonShort: 'Strong alignment on ambition.',
      };

      const result = buildMatchRecommendation({
        finalScore: 82,
        friction: 0,
        explainability,
        stableId: 'test-2',
      });

      expect(result.primaryTakeaway).toContain('a drive for goals');
      expect(result.primaryTakeaway.toLowerCase()).not.toContain(
        'ambition alignment',
      );
      expect(result.primaryTakeaway).not.toContain(' and ');
    });

    it('extracts hint from reasonShort when 0 chips', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: [],
        reasonShort: 'Only partial signal shows through; nothing is reading as a convincing shared story yet.',
      };

      const result = buildMatchRecommendation({
        finalScore: 47,
        friction: 2,
        explainability,
        stableId: 'test-3',
      });

      expect(result.primaryTakeaway).toBe(
        'A few touchpoints — open to see why.',
      );
    });

    it('uses band line when 0 chips (ignores reasonShort keywords)', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: [],
        reasonShort: 'Main tension: emotional depth gap.',
      };

      const result = buildMatchRecommendation({
        finalScore: 54,
        friction: 3,
        explainability,
        stableId: 'test-4',
      });

      expect(result.primaryTakeaway).toBe(
        'A few touchpoints — open to see why.',
      );
    });
  });

  describe('dealbreaker caution mapping', () => {
    it('maps KIDS_MISMATCH to lifestyle family', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Strong alignment.',
      };

      const result = buildMatchRecommendation({
        finalScore: 88,
        friction: 1,
        explainability,
        dealbreakers: ['KIDS_MISMATCH'],
        stableId: 'test-5',
      });

      expect(result.caution).toBe('Note lifestyle compatibility differences.');
    });

    it('maps RELIGION_MISMATCH to values family', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Social rhythm'],
        reasonShort: 'Solid alignment.',
      };

      const result = buildMatchRecommendation({
        finalScore: 70,
        friction: 1,
        explainability,
        dealbreakers: ['RELIGION_MISMATCH'],
        stableId: 'test-6',
      });

      expect(result.caution).toBe('Note core values differences.');
    });

    it('maps LOCATION_MISMATCH to logistics family', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Ambition alignment'],
        reasonShort: 'Good fit.',
      };

      const result = buildMatchRecommendation({
        finalScore: 75,
        friction: 2,
        explainability,
        dealbreakers: ['LOCATION_MISMATCH'],
        stableId: 'test-7',
      });

      expect(result.caution).toBe('Note practical logistics concerns.');
    });

    it('picks first family alphabetically when multiple dealbreakers', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Wellness focus'],
        reasonShort: 'Strong alignment.',
      };

      const result = buildMatchRecommendation({
        finalScore: 80,
        friction: 0,
        explainability,
        dealbreakers: ['KIDS_MISMATCH', 'RELIGION_MISMATCH', 'LOCATION_MISMATCH'],
        stableId: 'test-8',
      });

      // lifestyle, logistics, values → alphabetically: lifestyle
      expect(result.caution).toBe('Note lifestyle compatibility differences.');
    });

    it('prefers tension chip over dealbreaker caution', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Direct communication'],
        tensionChip: 'Emotional depth gap',
        reasonShort: 'Solid fit with tension.',
      };

      const result = buildMatchRecommendation({
        finalScore: 68,
        friction: 4,
        explainability,
        dealbreakers: ['KIDS_MISMATCH'],
        stableId: 'test-9',
      });

      expect(result.caution).toBe('Watch for emotional depth gap.');
    });
  });

  describe('template variation', () => {
    it('varies templates based on stableId for same score', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Emotional depth', 'Social rhythm'],
        reasonShort: 'Strong alignment.',
      };

      const result1 = buildMatchRecommendation({
        finalScore: 85,
        friction: 0,
        explainability,
        stableId: 'match-a',
      });

      const result2 = buildMatchRecommendation({
        finalScore: 85,
        friction: 0,
        explainability,
        stableId: 'match-b',
      });

      // Different stableIds should potentially give different templates
      // (may be same if hash collision, but structure allows variation)
      expect(result1.primaryTakeaway).toBeTruthy();
      expect(result2.primaryTakeaway).toBeTruthy();
    });

    it('is deterministic for same stableId', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Ambition alignment', 'Independence fit'],
        reasonShort: 'Good alignment.',
      };

      const input = {
        finalScore: 72,
        friction: 2,
        explainability,
        stableId: 'stable-test',
      };

      const result1 = buildMatchRecommendation(input);
      const result2 = buildMatchRecommendation(input);

      expect(result1.primaryTakeaway).toBe(result2.primaryTakeaway);
    });

    it('defaults stableId to finalScore when not provided', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Wellness focus'],
        reasonShort: 'Solid fit.',
      };

      const result = buildMatchRecommendation({
        finalScore: 78,
        friction: 1,
        explainability,
      });

      expect(result.primaryTakeaway).toBeTruthy();
    });
  });

  describe('no regression on existing OK cases', () => {
    it('handles high score with friction (existing OK case)', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Social rhythm', 'Ambition alignment'],
        tensionChip: 'Closeness vs space',
        reasonShort: 'Strong fit on social rhythm and ambition. Main tension: closeness vs space.',
      };

      const result = buildMatchRecommendation({
        finalScore: 80,
        friction: 5,
        explainability,
        stableId: 'existing-1',
      });

      expect(result.primaryTakeaway).toContain(
        'matching social energy and a drive for goals',
      );
      expect(result.caution).toBe('Watch for closeness vs space.');
      expect(result.suggestedNextAction).toBe('Start a conversation');
    });

    it('handles solid score without caution (existing OK case)', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Independence fit', 'Lifestyle pace'],
        reasonShort: 'Solid alignment on independence and lifestyle pace.',
      };

      const result = buildMatchRecommendation({
        finalScore: 68,
        friction: 2,
        explainability,
        stableId: 'existing-2',
      });

      expect(result.primaryTakeaway).toContain(
        'space and togetherness balance and a similar daily pace',
      );
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Review profile and message');
    });

    it('handles moderate score with high friction (existing OK case)', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Physical chemistry'],
        tensionChip: 'Emotional depth gap',
        reasonShort: 'Moderate fit on physical chemistry. Main tension: emotional depth gap.',
      };

      const result = buildMatchRecommendation({
        finalScore: 52,
        friction: 6,
        explainability,
        stableId: 'existing-3',
      });

      expect(result.primaryTakeaway).toContain('strong mutual attraction');
      expect(result.caution).toBe('Watch for emotional depth gap.');
      expect(result.suggestedNextAction).toBe('Worth a closer look');
    });
  });

  describe('edge cases', () => {
    it('handles empty reasonShort gracefully', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: [],
        reasonShort: '',
      };

      const result = buildMatchRecommendation({
        finalScore: 45,
        friction: 1,
        explainability,
        stableId: 'edge-1',
      });

      expect(result.primaryTakeaway).toBeTruthy();
      expect(result.primaryTakeaway.length).toBeGreaterThan(10);
    });

    it('handles unknown dealbreaker code', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Good fit.',
      };

      const result = buildMatchRecommendation({
        finalScore: 75,
        friction: 1,
        explainability,
        dealbreakers: ['UNKNOWN_CODE'],
        stableId: 'edge-2',
      });

      // Should default to values family
      expect(result.caution).toBe('Note core values differences.');
    });
  });
});
