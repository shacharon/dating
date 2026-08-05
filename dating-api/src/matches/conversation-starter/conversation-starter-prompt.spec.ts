import {
  buildConversationStarterSystemPrompt,
  buildConversationStarterUserPrompt,
} from './conversation-starter-prompt';
import type { ConversationStarterFactPack } from './conversation-starter.types';

describe('conversation-starter-prompt', () => {
  const pack: ConversationStarterFactPack = {
    finalScore: 92,
    scoreBand: 'strong',
    positiveChips: ['Emotional depth'],
    sharedInterests: ['hiking'],
    sharedInterestNote: 'You both enjoy hiking.',
    candidateNickname: 'Sara',
  };

  it('system prompt bans score/salesy openers', () => {
    const s = buildConversationStarterSystemPrompt();
    expect(s).toMatch(/15 words/i);
    expect(s).toMatch(/compatibility/i);
  });

  it('user prompt includes fact JSON', () => {
    const u = buildConversationStarterUserPrompt(pack);
    expect(u).toContain('hiking');
    expect(u).toContain('Sara');
    expect(u).not.toMatch(/aboutMe/i);
  });
});
