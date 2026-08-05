import {
  validateLlmOpener,
  cleanOpenerRaw,
  collectOpenerGroundingTokens,
} from './conversation-starter-validate';
import type { ConversationStarterFactPack } from './conversation-starter.types';

describe('conversation-starter-validate', () => {
  const pack: ConversationStarterFactPack = {
    finalScore: 90,
    scoreBand: 'strong',
    positiveChips: ['Emotional depth'],
    sharedInterests: ['hiking'],
    sharedInterestNote: 'You both enjoy hiking.',
  };

  it('strips wrapping quotes', () => {
    expect(cleanOpenerRaw('"Hello there?"')).toBe('Hello there?');
  });

  it('accepts short grounded openers', () => {
    const r = validateLlmOpener(
      'I saw you love hiking — have you done the Israel Trail?',
      pack,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.opener).toMatch(/hiking/i);
  });

  it('rejects too many words', () => {
    const long =
      'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen';
    expect(validateLlmOpener(long, pack).ok).toBe(false);
  });

  it('rejects deny phrases', () => {
    expect(
      validateLlmOpener('Our compatibility is amazing right?', pack).ok,
    ).toBe(false);
  });

  it('rejects ungrounded inventions when facts exist', () => {
    expect(
      validateLlmOpener('Your Japan trip looked amazing — tips?', pack).ok,
    ).toBe(false);
  });

  it('collects grounding tokens from interests and chips', () => {
    const tokens = collectOpenerGroundingTokens(pack);
    expect(tokens.some((t) => t.includes('hik'))).toBe(true);
  });
});
