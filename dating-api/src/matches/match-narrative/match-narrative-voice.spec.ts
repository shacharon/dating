import {
  containsBannedPhrase,
  findBannedPhrase,
  nextActionForLlm,
  LLM_SAFE_NEXT_ACTION,
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

  it('rejects v3 brochure CTAs', () => {
    expect(findBannedPhrase('There is mutual appreciation here.')).toBe(
      'mutual appreciation',
    );
    expect(findBannedPhrase('It is worth a closer look together.')).toBe(
      'worth a closer look',
    );
    expect(
      findBannedPhrase('This leads to more meaningful conversations ahead.'),
    ).toBe('meaningful conversations');
    expect(findBannedPhrase('in a one-on-one setting with them.')).toBe(
      'one-on-one setting',
    );
  });

  it('sanitizes banned next actions for LLM', () => {
    expect(nextActionForLlm('Worth a closer look')).toBe(LLM_SAFE_NEXT_ACTION);
    expect(nextActionForLlm('Ask about their last hike.')).toBe(
      'Ask about their last hike.',
    );
    expect(nextActionForLlm('  ')).toBeUndefined();
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
