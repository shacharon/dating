import { MatchNarrativeGenerator } from './match-narrative.generator';
import { buildMatchNarrativeFactPack } from './match-narrative-fact-pack';
import { buildFallbackMatchNarrative } from './match-narrative-fallback';
import type { LLMRouterService } from '../../llm/llm-router.service';

describe('MatchNarrativeGenerator', () => {
  const pack = buildMatchNarrativeFactPack({
    finalScore: 55,
    explainability: {
      positiveChips: ['Emotional depth', 'Ambition alignment'],
      reasonShort: 'Some alignment.',
    },
  });

  function makeGen(completeJSON: jest.Mock): MatchNarrativeGenerator {
    const llm = { completeJSON } as unknown as LLMRouterService;
    return new MatchNarrativeGenerator(llm);
  }

  it('returns llm source on valid narrative', async () => {
    const narrative = [
      'You both care about emotional presence when things get real.',
      'Drive and ambition also show up in how you chase goals.',
      'Those two threads form a clear middle-ground fit.',
      'There is enough overlap to feel curious, not forced.',
      'A thoughtful first message would fit this pairing.',
    ].join(' ');
    const completeJSON = jest.fn().mockResolvedValue({
      value: { narrative },
      rawText: JSON.stringify({ narrative }),
    });
    const gen = makeGen(completeJSON);
    const result = await gen.generate(pack, { requestId: 'test-req-1' });
    expect(result.source).toBe('llm');
    expect(result.narrative).toBe(narrative);
    expect(result.promptVersion).toBe('v2');
    expect(completeJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'match_narrative',
        modelKey: 'fast',
        requestId: 'test-req-1',
      }),
    );
    const userPrompt = completeJSON.mock.calls[0][0].user as string;
    expect(userPrompt).not.toContain('Ambition alignment');
    expect(userPrompt).not.toContain('positiveChips');
  });

  it('falls back when LLM throws', async () => {
    const completeJSON = jest.fn().mockRejectedValue(new Error('timeout'));
    const gen = makeGen(completeJSON);
    const result = await gen.generate(pack, { requestId: 'test-req-2' });
    expect(result.source).toBe('fallback');
    expect(result.narrative).toBe(buildFallbackMatchNarrative(pack));
  });

  it('falls back when validation fails (empty)', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: { narrative: '   ' },
      rawText: '{}',
    });
    const gen = makeGen(completeJSON);
    const result = await gen.generate(pack, { requestId: 'test-req-3' });
    expect(result.source).toBe('fallback');
    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it('falls back when narrative is ungrounded', async () => {
    const narrative = [
      'The weather looks nice today for a walk outside.',
      'Coffee shops are busy in the afternoon hours.',
      'Trains sometimes run late on weekdays downtown.',
      'None of this mentions the match signals at all.',
      'Still five sentences of unrelated filler text.',
    ].join(' ');
    const completeJSON = jest.fn().mockResolvedValue({
      value: { narrative },
      rawText: JSON.stringify({ narrative }),
    });
    const gen = makeGen(completeJSON);
    const result = await gen.generate(pack, { requestId: 'test-req-4' });
    expect(result.source).toBe('fallback');
    expect(result.narrative).toBe(buildFallbackMatchNarrative(pack));
  });

  it('falls back when narrative is banned fluff', async () => {
    const narrative = [
      'You both share drive and emotional presence day to day.',
      'This creates a solid foundation for a meaningful connection ahead.',
      'Your lifestyles also seem to move at a similar daily pace.',
      'Overall these threads give a promising basis for exploration.',
      'It might be worth taking a closer look at this potential relationship.',
    ].join(' ');
    const completeJSON = jest.fn().mockResolvedValue({
      value: { narrative },
      rawText: JSON.stringify({ narrative }),
    });
    const gen = makeGen(completeJSON);
    const result = await gen.generate(pack, { requestId: 'test-req-5' });
    expect(result.source).toBe('fallback');
    expect(result.narrative).toBe(buildFallbackMatchNarrative(pack));
  });
});
