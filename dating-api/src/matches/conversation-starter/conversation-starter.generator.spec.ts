import { ConversationStarterGenerator } from './conversation-starter.generator';
import type { ConversationStarterFactPack } from './conversation-starter.types';

describe('ConversationStarterGenerator', () => {
  const pack: ConversationStarterFactPack = {
    finalScore: 90,
    scoreBand: 'strong',
    positiveChips: ['Lifestyle pace'],
    sharedInterests: ['hiking'],
  };

  it('returns llm opener when valid', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: { opener: 'Into hiking too — done the Israel Trail yet?' },
      rawText: '{}',
    });
    const gen = new ConversationStarterGenerator({ completeJSON } as never);
    const result = await gen.generate({ factPack: pack, requestId: 'r1' });
    expect(result.source).toBe('llm');
    expect(result.opener).toMatch(/hiking/i);
    expect(completeJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'conversation_starter',
        modelKey: 'fast',
      }),
    );
  });

  it('falls back when LLM invents ungrounded facts', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: { opener: 'Your Japan trip looked amazing — tips?' },
      rawText: '{}',
    });
    const gen = new ConversationStarterGenerator({ completeJSON } as never);
    const result = await gen.generate({ factPack: pack, requestId: 'r1' });
    expect(result.source).toBe('fallback');
    expect(result.opener).toMatch(/hiking/i);
  });

  it('falls back on LLM throw when interests exist', async () => {
    const gen = new ConversationStarterGenerator({
      completeJSON: jest.fn().mockRejectedValue(new Error('timeout')),
    } as never);
    const result = await gen.generate({ factPack: pack, requestId: 'r1' });
    expect(result.source).toBe('fallback');
    expect(result.opener).toMatch(/hiking/i);
  });

  it('returns none when LLM fails and no interests', async () => {
    const gen = new ConversationStarterGenerator({
      completeJSON: jest.fn().mockRejectedValue(new Error('timeout')),
    } as never);
    const result = await gen.generate({
      factPack: { ...pack, sharedInterests: [] },
      requestId: 'r1',
    });
    expect(result.source).toBe('none');
    expect(result.opener).toBeNull();
  });
});
