import { buildMatchRecommendation } from './match-recommendation';
import type { MatchExplainabilityDto } from './match-explainability';

describe('buildMatchRecommendation', () => {
  describe('high score, no friction', () => {
    it('returns strong takeaway with conversation action', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Emotional depth', 'Direct communication'],
        reasonShort: 'Strong alignment on emotional depth and direct communication.',
      };

      const result = buildMatchRecommendation({
        finalScore: 85,
        friction: 0,
        explainability,
      });

      // Multi-chip: should mention both top chips
      expect(result.primaryTakeaway).toContain('emotional depth');
      expect(result.primaryTakeaway).toContain('direct communication');
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Start a conversation');
      expect(result.explainability).toBe(explainability);
    });

    it('handles high score with no chips', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: [],
        reasonShort: 'Strong overall alignment.',
      };

      const result = buildMatchRecommendation({
        finalScore: 82,
        friction: 1,
        explainability,
      });

      // No chips: should extract hint from reasonShort or use fallback
      expect(result.primaryTakeaway).toBeTruthy();
      expect(result.primaryTakeaway.length).toBeGreaterThan(15);
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Start a conversation');
    });
  });

  describe('high score, with friction', () => {
    it('includes caution from tension chip when friction >= 3', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Social rhythm', 'Ambition alignment'],
        tensionChip: 'Closeness vs space',
        reasonShort: 'Strong fit on social rhythm and ambition. Main tension: closeness vs space.',
      };

      const result = buildMatchRecommendation({
        finalScore: 80,
        friction: 5,
        explainability,
      });

      // Multi-chip: should mention both top chips
      expect(result.primaryTakeaway).toContain('social rhythm');
      expect(result.primaryTakeaway).toContain('ambition');
      expect(result.caution).toBe('Watch for closeness vs space.');
      expect(result.suggestedNextAction).toBe('Start a conversation');
    });

    it('includes caution from dealbreakers when present', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Wellness focus'],
        reasonShort: 'Strong alignment on wellness focus.',
      };

      const result = buildMatchRecommendation({
        finalScore: 88,
        friction: 2,
        explainability,
        dealbreakers: ['KIDS_MISMATCH'],
      });

      // Single chip: should mention wellness focus
      expect(result.primaryTakeaway).toContain('wellness focus');
      // Dealbreaker caution now uses family-based mapping
      expect(result.caution).toContain('lifestyle');
      expect(result.suggestedNextAction).toBe('Start a conversation');
    });

    it('prefers tension chip over dealbreaker in caution', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Shared values'],
        tensionChip: 'Different pace of life',
        reasonShort: 'Strong values alignment. Friction point: different pace of life.',
      };

      const result = buildMatchRecommendation({
        finalScore: 83,
        friction: 4,
        explainability,
        dealbreakers: ['LOCATION_MISMATCH'],
      });

      expect(result.caution).toBe('Watch for different pace of life.');
    });
  });

  describe('medium score', () => {
    it('returns solid takeaway for 60-79 band', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Independence fit', 'Lifestyle pace'],
        reasonShort: 'Solid alignment on independence and lifestyle pace.',
      };

      const result = buildMatchRecommendation({
        finalScore: 68,
        friction: 2,
        explainability,
      });

      // Multi-chip: should mention both top chips
      expect(result.primaryTakeaway).toContain('independence fit');
      expect(result.primaryTakeaway).toContain('lifestyle pace');
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Review profile and message');
    });

    it('returns moderate takeaway for 50-59 band', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Money mindset'],
        reasonShort: 'Moderate overlap on money mindset.',
      };

      const result = buildMatchRecommendation({
        finalScore: 55,
        friction: 1,
        explainability,
      });

      // Single chip: should mention money mindset
      expect(result.primaryTakeaway).toContain('money mindset');
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Worth a closer look');
    });

    it('includes caution for moderate score with high friction', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Physical chemistry'],
        tensionChip: 'Emotional depth gap',
        reasonShort: 'Moderate fit on physical chemistry. Main tension: emotional depth gap.',
      };

      const result = buildMatchRecommendation({
        finalScore: 52,
        friction: 6,
        explainability,
      });

      // Single chip: should mention physical chemistry
      expect(result.primaryTakeaway).toContain('physical chemistry');
      expect(result.caution).toBe('Watch for emotional depth gap.');
      expect(result.suggestedNextAction).toBe('Worth a closer look');
    });
  });

  describe('low score', () => {
    it('returns partial takeaway for 40-49 band', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Relationship expectations'],
        reasonShort: 'Partial overlap on relationship expectations.',
      };

      const result = buildMatchRecommendation({
        finalScore: 45,
        friction: 2,
        explainability,
      });

      expect(result.primaryTakeaway).toContain('Partial overlap');
      expect(result.primaryTakeaway).toContain('relationship expectations');
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Skim profile first');
    });

    it('returns limited takeaway for <40 band', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Secure attachment'],
        reasonShort: 'Limited fit with narrow overlap on secure attachment.',
      };

      const result = buildMatchRecommendation({
        finalScore: 35,
        friction: 1,
        explainability,
      });

      // Single chip: should mention secure attachment
      expect(result.primaryTakeaway).toContain('secure attachment');
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Consider other matches first');
    });

    it('handles low score with no chips', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: [],
        reasonShort: 'Limited fit across most dimensions.',
      };

      const result = buildMatchRecommendation({
        finalScore: 28,
        friction: 0,
        explainability,
      });

      // No chips: should extract hint or use fallback
      expect(result.primaryTakeaway).toBeTruthy();
      expect(result.primaryTakeaway.length).toBeGreaterThan(15);
      expect(result.caution).toBeUndefined();
      expect(result.suggestedNextAction).toBe('Consider other matches first');
    });
  });

  describe('dealbreaker-driven caution', () => {
    it('shows caution for dealbreakers even with low friction', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Ambition alignment', 'Social rhythm'],
        reasonShort: 'Strong alignment on ambition and social rhythm.',
      };

      const result = buildMatchRecommendation({
        finalScore: 75,
        friction: 1,
        explainability,
        dealbreakers: ['RELIGION_MISMATCH', 'KIDS_MISMATCH'],
      });

      // Multi-chip: should mention chips
      expect(result.primaryTakeaway).toContain('ambition');
      expect(result.primaryTakeaway).toContain('social rhythm');
      // Dealbreaker caution now uses family-based mapping
      expect(result.caution).toContain('lifestyle');
      expect(result.suggestedNextAction).toBe('Review profile and message');
    });

    it('omits caution when friction < 3 and no dealbreakers', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Direct communication'],
        reasonShort: 'Solid alignment on direct communication.',
      };

      const result = buildMatchRecommendation({
        finalScore: 70,
        friction: 2,
        explainability,
        dealbreakers: [],
      });

      expect(result.caution).toBeUndefined();
    });

    it('shows generic friction caution when friction >= 3 but no tension chip or dealbreakers', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Wellness focus'],
        reasonShort: 'Moderate alignment on wellness focus.',
      };

      const result = buildMatchRecommendation({
        finalScore: 58,
        friction: 4,
        explainability,
      });

      expect(result.caution).toBe('Some friction points to consider.');
    });
  });

  describe('determinism', () => {
    it('returns identical output for identical input', () => {
      const input = {
        finalScore: 72,
        friction: 3,
        explainability: {
          positiveChips: ['Emotional depth', 'Social rhythm'],
          tensionChip: 'Stability vs mobility',
          reasonShort: 'Solid fit on emotional depth and social rhythm. Main tension: stability vs mobility.',
        } as MatchExplainabilityDto,
        dealbreakers: ['LOCATION_MISMATCH'],
      };

      const result1 = buildMatchRecommendation(input);
      const result2 = buildMatchRecommendation(input);

      expect(result1).toEqual(result2);
    });
  });

  describe('no engine jargon', () => {
    it('avoids raw numeric values in UI text', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Ambition alignment'],
        tensionChip: 'Different money mindset',
        reasonShort: 'Strong ambition alignment. Friction: different money mindset.',
      };

      const result = buildMatchRecommendation({
        finalScore: 78,
        friction: 5,
        explainability,
      });

      expect(result.primaryTakeaway).not.toMatch(/\d+/);
      expect(result.caution).not.toMatch(/\d+/);
      expect(result.suggestedNextAction).not.toMatch(/\d+/);
    });

    it('uses product-clean wording only', () => {
      const explainability: MatchExplainabilityDto = {
        positiveChips: ['Lifestyle pace'],
        reasonShort: 'Moderate lifestyle pace alignment.',
      };

      const result = buildMatchRecommendation({
        finalScore: 54,
        friction: 2,
        explainability,
      });

      expect(result.primaryTakeaway).not.toContain('compatibility');
      expect(result.primaryTakeaway).not.toContain('score');
      expect(result.primaryTakeaway).not.toContain('friction');
      expect(result.suggestedNextAction).not.toContain('compatibility');
    });
  });
});
