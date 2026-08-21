import { runEvaluateMotivation } from './evaluate-motivation.runner';
import { runEvaluateAttractionTraits } from './evaluate-attraction-traits.runner';
import { runEvaluateSummary } from './evaluate-summary.runner';
import { SUMMARY_SYSTEM_PROMPT } from './evaluate-llm-prompts';

describe('evaluate LLM runners (sprint-59 story 2)', () => {
  it('runEvaluateMotivation passes evaluate-motivation purpose', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: {
        relationshipMotivation: 'companionship',
        confidence: 0.8,
        evidence: [],
      },
      rawText: '{}',
      usage: {},
    });
    const log = jest.fn();

    const out = await runEvaluateMotivation(
      { completeJSON } as never,
      { log },
      'me',
      'partner',
      'rel',
      { collectTrace: true },
    );

    expect(completeJSON).toHaveBeenCalledTimes(1);
    expect(completeJSON.mock.calls[0][0].purpose).toBe('evaluate-motivation');
    expect(completeJSON.mock.calls[0][0].modelKey).toBe('fast');
    expect(out.relationshipMotivation).toBe('companionship');
    expect(out._evaluateLlmTrace).toBeDefined();
    expect(log).toHaveBeenCalled();
  });

  it('runEvaluateAttractionTraits keeps eval_traits latencyStage', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: {
        attraction: {
          ambition: 5,
          statusOrientation: 5,
          physicalPriority: 5,
          kindnessWarmth: 5,
          stabilityReliability: 5,
          independenceAutonomy: 5,
          emotionalDepth: 5,
          traditionalismValues: 5,
          financialPrudence: 5,
        },
        confidence: 0.5,
        evidence: [],
      },
      rawText: null,
      usage: {},
    });

    await runEvaluateAttractionTraits(
      { completeJSON } as never,
      { log: jest.fn() },
      'partner text',
      'me',
      'rel',
    );

    const arg = completeJSON.mock.calls[0][0];
    expect(arg.purpose).toBe('evaluate-attraction-traits');
    expect(arg.latencyStage).toBe('eval_traits');
  });

  it('runEvaluateSummary uses SUMMARY_SYSTEM_PROMPT and evaluate-summary', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: {
        overallNarrative: 'n',
        aboutMeInsight: 'a',
        relationshipInsight: 'r',
        partnerInsight: 'p',
        missingPrompts: [],
        summary: 's',
        insight: 'i',
      },
      rawText: '{}',
      usage: {},
    });

    const emptySignals = {
      domain: 'self' as const,
      signals: {},
      evidence: [],
      confidence: 0.5,
      version: 'v1',
    };

    await runEvaluateSummary(
      { completeJSON } as never,
      { log: jest.fn() },
      emptySignals,
      { ...emptySignals, domain: 'partner' },
      { ...emptySignals, domain: 'relationship' },
    );

    const arg = completeJSON.mock.calls[0][0];
    expect(arg.purpose).toBe('evaluate-summary');
    expect(arg.system).toBe(SUMMARY_SYSTEM_PROMPT);
  });
});
