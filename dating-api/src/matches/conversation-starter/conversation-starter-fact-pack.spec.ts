import {
  buildConversationStarterFactPack,
  scoreBandFromFinalScore,
} from './conversation-starter-fact-pack';

describe('conversation-starter-fact-pack', () => {
  it('maps score bands like narrative', () => {
    expect(scoreBandFromFinalScore(85)).toBe('strong');
    expect(scoreBandFromFinalScore(65)).toBe('solid');
    expect(scoreBandFromFinalScore(55)).toBe('moderate');
    expect(scoreBandFromFinalScore(45)).toBe('partial');
    expect(scoreBandFromFinalScore(10)).toBe('weak');
  });

  it('builds pack without about* and caps chips', () => {
    const pack = buildConversationStarterFactPack({
      finalScore: 90,
      explainability: {
        positiveChips: ['a', 'b', 'c', 'd', 'e', 'f'],
        reasonShort: 'r',
        sharedInterestNote: 'You both enjoy hiking.',
        tensionChip: 'Pace',
      },
      sharedInterests: ['hiking'],
      candidateNickname: 'Sara',
    });
    expect(pack.positiveChips).toHaveLength(5);
    expect(pack.sharedInterests).toEqual(['hiking']);
    expect(pack.sharedInterestNote).toBe('You both enjoy hiking.');
    expect(pack.candidateNickname).toBe('Sara');
    expect(pack).not.toHaveProperty('aboutMe');
  });
});
