import { buildMatchNarrativeFactPack } from './match-narrative-fact-pack';
import { buildFallbackMatchNarrative } from './match-narrative-fallback';
import { textContainsChipLabel } from '../explainability/core/match-explanation-traits';

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
    expect(textContainsChipLabel(a)).toBeNull();
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

  it('sanitizes soft CTA suggestedNextAction (v3)', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: {
        positiveChips: ['Emotional depth'],
        reasonShort: 'x',
      },
      recommendation: {
        suggestedNextAction: 'Worth a closer look',
      },
    });
    const text = buildFallbackMatchNarrative(pack);
    expect(text.toLowerCase()).not.toContain('worth a closer look');
    expect(text).toMatch(/concrete question|evidence|shared interests/i);
  });

  it('never dumps profileExcerpts / raw about text', () => {
    const secret =
      'UNIQUE_SECRET_ABOUT_BLOB_xyz that must never appear in fallback output.';
    const pack = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: {
        positiveChips: ['Emotional depth'],
        reasonShort: 'x',
      },
      viewerAbout: { aboutMe: secret },
      candidateAbout: {
        aboutMe:
          'Another UNIQUE_CANDIDATE_BLOB_abc for solitude and quiet mornings.',
      },
    });
    expect(pack.profileExcerpts?.length).toBeGreaterThan(0);
    const text = buildFallbackMatchNarrative(pack);
    expect(text).not.toContain('UNIQUE_SECRET_ABOUT_BLOB_xyz');
    expect(text).not.toContain('UNIQUE_CANDIDATE_BLOB_abc');
    expect(textContainsChipLabel(text)).toBeNull();
  });

  it('thin pack (0 traits) stays non-empty without chip labels', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: {
        positiveChips: [],
        reasonShort: 'You share real overlap on Ambition alignment.',
      },
      traits: [],
    });
    const text = buildFallbackMatchNarrative(pack);
    expect(text.length).toBeGreaterThan(40);
    expect(text).toMatch(/isn't enough shared detail/i);
    expect(text).not.toContain('Ambition alignment');
    expect(textContainsChipLabel(text)).toBeNull();
  });
});
