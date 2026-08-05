import {
  buildFallbackConversationStarter,
} from './conversation-starter-fallback';
import { parseSharedInterestLabels } from './conversation-starter-validate';
import type { ConversationStarterFactPack } from './conversation-starter.types';

function pack(
  overrides: Partial<ConversationStarterFactPack> = {},
): ConversationStarterFactPack {
  return {
    finalScore: 90,
    scoreBand: 'strong',
    positiveChips: ['Emotional depth'],
    sharedInterests: [],
    ...overrides,
  };
}

describe('conversation-starter-fallback', () => {
  it('parses shared interest note labels', () => {
    expect(parseSharedInterestLabels('You both enjoy hiking, cooking.')).toEqual(
      ['hiking', 'cooking'],
    );
  });

  it('uses sharedInterests tag first', () => {
    const opener = buildFallbackConversationStarter(
      pack({ sharedInterests: ['hiking'] }),
    );
    expect(opener).toMatch(/hiking/i);
    expect(opener!.split(/\s+/).length).toBeLessThanOrEqual(15);
  });

  it('falls back to note labels', () => {
    const opener = buildFallbackConversationStarter(
      pack({
        sharedInterests: [],
        sharedInterestNote: 'You both enjoy cooking.',
      }),
    );
    expect(opener).toMatch(/cooking/i);
  });

  it('returns null without interest context', () => {
    expect(buildFallbackConversationStarter(pack())).toBeNull();
  });
});
