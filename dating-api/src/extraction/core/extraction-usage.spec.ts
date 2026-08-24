import {
  emptyUsage,
  estimateCost,
  mergeUsage,
  parseOpenAIUsage,
} from './extraction-usage';

describe('extraction-usage (sprint-58 story 3)', () => {
  it('parseOpenAIUsage maps OpenAI-style fields and defaults missing', () => {
    expect(
      parseOpenAIUsage({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      }),
    ).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    expect(parseOpenAIUsage(null)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    expect(
      parseOpenAIUsage({ prompt_tokens: 3, completion_tokens: 2 }),
    ).toEqual({ promptTokens: 3, completionTokens: 2, totalTokens: 5 });
  });

  it('estimateCost and mergeUsage accumulate', () => {
    const cost = estimateCost(1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.15 + 0.6, 10);

    const a = emptyUsage();
    const b = {
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
      estimatedCostUSD: 0.01,
      durationMs: 4,
    };
    expect(mergeUsage(a, b)).toEqual(b);
    expect(mergeUsage(b, b)).toEqual({
      promptTokens: 2,
      completionTokens: 4,
      totalTokens: 6,
      estimatedCostUSD: 0.02,
      durationMs: 8,
    });
  });
});
