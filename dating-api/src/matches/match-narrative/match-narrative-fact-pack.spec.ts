import {
  buildMatchNarrativeFactPack,
  scoreBandFromFinalScore,
} from './match-narrative-fact-pack';
import type { MatchExplainabilityDto } from '../match-explainability';

function explainability(
  overrides: Partial<MatchExplainabilityDto> = {},
): MatchExplainabilityDto {
  return {
    positiveChips: ['Emotional depth', 'Ambition alignment'],
    reasonShort: 'Some alignment.',
    ...overrides,
  };
}

describe('scoreBandFromFinalScore', () => {
  it('maps recommendation bands', () => {
    expect(scoreBandFromFinalScore(80)).toBe('strong');
    expect(scoreBandFromFinalScore(60)).toBe('solid');
    expect(scoreBandFromFinalScore(50)).toBe('moderate');
    expect(scoreBandFromFinalScore(40)).toBe('partial');
    expect(scoreBandFromFinalScore(39)).toBe('weak');
  });
});

describe('buildMatchNarrativeFactPack', () => {
  it('builds pack without about* keys', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: explainability({
        tensionChip: 'Emotional depth gap',
        sharedInterestNote: 'You both enjoy hiking.',
      }),
      recommendation: {
        caution: 'Note lifestyle differences.',
        suggestedNextAction: 'Send a thoughtful first message.',
      },
      sharedInterests: ['hiking'],
    });

    expect(pack.scoreBand).toBe('moderate');
    expect(pack.positiveChips).toEqual([
      'Emotional depth',
      'Ambition alignment',
    ]);
    expect(pack.traits.length).toBeGreaterThan(0);
    expect(pack.tensionChip).toBe('Emotional depth gap');
    expect(pack.sharedInterests).toEqual(['hiking']);
    expect(pack.sharedInterestNote).toBe('You both enjoy hiking.');
    expect(Object.keys(pack)).not.toEqual(
      expect.arrayContaining(['aboutMe', 'aboutPartner', 'aboutRelationship']),
    );
    expect('aboutMe' in pack).toBe(false);
    expect('aboutPartner' in pack).toBe(false);
    expect('aboutRelationship' in pack).toBe(false);
  });

  it('includes Conflict approach when chip present', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 70,
      explainability: explainability({
        positiveChips: ['Conflict approach', 'Emotional depth'],
      }),
    });
    expect(pack.traits.some((t) => t.label === 'Conflict approach')).toBe(
      true,
    );
  });
});
