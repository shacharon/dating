import { runEvaluateBatch } from './evaluate-batch.orchestrator';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import { EvaluateServiceModule } from './evaluate-service.module';

function mockExtracted(
  domain: 'self' | 'partner' | 'relationship',
): ExtractedSignals {
  const keys = [
    'ambition',
    'socialBattery',
    'healthBodyConsciousness',
    'emotionalDepth',
    'attachmentSecurity',
    'directness',
    'independence',
    'traditionalism',
    'financialMindset',
    'relationshipClarity',
    'spirituality',
    'lifestylePace',
    'physicalPriority',
    'statusOrientation',
  ];
  const signals: Record<string, number | null> = {};
  for (const k of keys) signals[k] = 5;
  return {
    domain,
    signals,
    evidence: keys.slice(0, 3).map((signal) => ({
      signal,
      quote: 'quote',
      reason: 'test',
    })),
    version: 'v1',
    confidence: 0.8,
  };
}

describe('evaluate-batch.orchestrator (sprint-59 story 3)', () => {
  it('EvaluateServiceModule still only lists EvaluateService as provider/export', () => {
    const mod = Reflect.getMetadata('providers', EvaluateServiceModule) as unknown[];
    const exp = Reflect.getMetadata('exports', EvaluateServiceModule) as unknown[];
    expect(mod).toEqual(expect.arrayContaining([expect.anything()]));
    // Nest stores provider classes; ensure orchestrator is not registered
    const providerNames = (mod ?? []).map((p) =>
      typeof p === 'function' ? p.name : (p as { provide?: { name?: string } })?.provide?.name ?? String(p),
    );
    expect(providerNames).toContain('EvaluateService');
    expect(providerNames.join(',')).not.toMatch(/orchestrator/i);
    const exportNames = (exp ?? []).map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(exportNames).toEqual(['EvaluateService']);
  });

  it('runEvaluateBatch keeps batch ok when extended-signal LLM fails (optional-catch)', async () => {
    const extractAllThree = jest.fn().mockResolvedValue({
      self: mockExtracted('self'),
      partner: mockExtracted('partner'),
      relationship: mockExtracted('relationship'),
      _usage: {},
    });
    const warn = jest.fn();
    const log = jest.fn();
    const completeJSON = jest.fn().mockImplementation(
      async ({ purpose }: { purpose: string }) => {
        if (purpose === 'evaluate-summary') {
          return {
            value: {
              overallNarrative: 'n',
              aboutMeInsight: 'a',
              relationshipInsight: 'r',
              partnerInsight: 'p',
              missingPrompts: [],
              summary: 's',
              insight: 'i',
            },
          };
        }
        if (purpose === 'evaluate-derived-context') {
          return {
            value: {
              version: 'v1',
              occupationClass: 'STANDARD_SCHEDULE',
              visibilityNeed: 5,
              lifeStage: 5,
              confidence: 0.5,
              evidence: [],
            },
          };
        }
        if (
          purpose === 'evaluate-motivation' ||
          purpose === 'evaluate-attraction-traits'
        ) {
          throw new Error('extended LLM down');
        }
        return { value: {} };
      },
    );

    const { ok, result } = await runEvaluateBatch(
      {
        extractionService: { extractAllThree } as never,
        llm: { completeJSON } as never,
        logger: { log, warn, error: jest.fn() } as never,
      },
      {
        aboutMe: 'me text',
        aboutPartner: 'partner text',
        aboutRelationship: 'rel text',
      },
    );

    expect(ok).toBe(true);
    expect(result.self).toBeDefined();
    expect(result.derivedContext).toBeDefined();
    expect(result.extendedSignals.relationshipMotivation).toBeUndefined();
    expect(result.extendedSignals.attractionTraits).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Extended signals inference failed'),
      'EvaluateService',
    );
  });
});
