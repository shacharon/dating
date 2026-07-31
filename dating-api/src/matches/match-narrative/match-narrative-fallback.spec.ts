import { buildMatchNarrativeFactPack } from './match-narrative-fact-pack';
import { buildFallbackMatchNarrative } from './match-narrative-fallback';

describe('buildFallbackMatchNarrative', () => {
  it('is deterministic, uses evidence, and does not list chip labels', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: {
        positiveChips: ['Emotional depth', 'Ambition alignment'],
        reasonShort: 'Some alignment.',
        sharedInterestNote: 'You both enjoy hiking.',
        tensionChip: 'Emotional depth gap',
      },
      sharedInterests: ['hiking'],
      recommendation: {
        suggestedNextAction: 'Ask about a recent hike.',
      },
    });

    const a = buildFallbackMatchNarrative(pack);
    const b = buildFallbackMatchNarrative(pack);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(40);
    expect(a).toMatch(/emotional|depth|ambition|drive/i);
    expect(a).toMatch(/hiking|You both enjoy/i);
    expect(a).not.toContain('Ambition alignment');
    expect(a).not.toMatch(/clearest shared signals/i);
    expect(a.toLowerCase()).not.toContain('emotional depth gap');
    expect(a).toMatch(/emotional intensity|worth naming/i);
  });

  it('does not echo jargon tension chip labels', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 45,
      explainability: {
        positiveChips: ['Emotional depth'],
        reasonShort: 'x',
        tensionChip: 'Ambition alignment',
      },
    });
    const text = buildFallbackMatchNarrative(pack);
    expect(text.toLowerCase()).not.toContain('ambition alignment');
    expect(text.toLowerCase()).not.toContain('alignment');
    expect(text).toMatch(/early honest conversation/i);
  });
});
