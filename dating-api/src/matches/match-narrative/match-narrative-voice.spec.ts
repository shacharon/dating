import {
  containsBannedPhrase,
  findBannedPhrase,
  tensionNoteFromChip,
} from './match-narrative-voice';

describe('match-narrative-voice', () => {
  it('finds specific ban before generic alignment', () => {
    expect(findBannedPhrase('This ambition alignment is bad.')).toBe(
      'ambition alignment',
    );
    expect(containsBannedPhrase('solid foundation here')).toBe(true);
    expect(containsBannedPhrase('plain concrete prose')).toBe(false);
  });

  it('maps known tension chips and scrubs jargon chips', () => {
    expect(tensionNoteFromChip('Emotional depth gap')).toMatch(
      /emotional intensity/i,
    );
    expect(tensionNoteFromChip('Ambition alignment')).toMatch(
      /early honest conversation/i,
    );
    expect(tensionNoteFromChip('Ambition alignment').toLowerCase()).not.toContain(
      'alignment',
    );
  });
});
