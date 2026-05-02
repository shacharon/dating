import { describe, expect, it } from 'vitest';
import { mapEvaluationToViewModel } from '@/lib/analysis-presentation';

describe('mapEvaluationToViewModel', () => {
  it('uses new presentation fields when present', () => {
    const vm = mapEvaluationToViewModel({
      display: {
        overallNarrative: 'You show warmth and thoughtfulness across your profile.',
        aboutMeInsight: 'You present yourself as emotionally open and grounded.',
        relationshipInsight: 'You value calm communication and steady connection.',
        partnerInsight: 'You are drawn to kind, emotionally mature partners.',
      },
      flags: [],
    });

    expect(vm.heroSubtitle).toBe(
      'You show warmth and thoughtfulness across your profile.',
    );
    expect(vm.relationshipInsight).toBe(
      'You value calm communication and steady connection.',
    );
    expect(vm.aboutMeInsight).toBe(
      'You present yourself as emotionally open and grounded.',
    );
    expect(vm.partnerPreferenceInsight).toBe(
      'You are drawn to kind, emotionally mature partners.',
    );
    expect(vm.selfHighlights[0]).toBe(
      'You present yourself as emotionally open and grounded.',
    );
    expect(vm.partnerHighlights[0]).toBe(
      'You are drawn to kind, emotionally mature partners.',
    );
  });

  it('remains compatible with old evaluations that only have summary/insight', () => {
    const vm = mapEvaluationToViewModel({
      display: {
        summary: 'You seem intentional and relationship-minded.',
        insight: 'You value emotional steadiness.',
      },
      flags: [],
    });

    expect(vm.heroSubtitle).toBe('You seem intentional and relationship-minded.');
    expect(vm.relationshipInsight).toBe('You value emotional steadiness.');
    expect(vm.aboutMeInsight.length).toBeGreaterThan(0);
    expect(vm.partnerPreferenceInsight.length).toBeGreaterThan(0);
  });

  it('uses warm sparse note when profile is sparse', () => {
    const vm = mapEvaluationToViewModel({
      display: { summary: 'Short profile.' },
      flags: ['LOW_COVERAGE'],
    });

    expect(vm.isSparse).toBe(true);
    expect(vm.note).toBe(
      'Light on detail. A few more lines in your profile will sharpen this read.',
    );
  });

  it('does not leak raw clinical/technical phrasing from LLM display text', () => {
    const vm = mapEvaluationToViewModel({
      display: {
        overallNarrative:
          'Based on limited information we cannot ascertain the individual intent.',
        relationshipInsight:
          'Insufficient evidence for relationship style.',
        aboutMeInsight:
          'This individual may be hard to ascertain with limited information.',
      },
      flags: [],
    });

    const heroLower = (vm.heroSubtitle ?? '').toLowerCase();
    expect(heroLower).not.toContain('limited information');
    expect(heroLower).not.toContain('ascertain');
    expect(vm.relationshipInsight.toLowerCase()).not.toContain(
      'insufficient evidence',
    );
    expect(vm.selfHighlights.join(' ').toLowerCase()).not.toContain('individual');
  });
});
