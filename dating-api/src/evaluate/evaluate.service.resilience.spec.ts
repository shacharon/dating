/**
 * Sub-split from evaluate.service.spec.ts (Sprint 69 Story 04).
 * derivedContext + LLM fail-open
 */
import { ExtractionService } from '../extraction/extraction.service';
import {
  createEvaluateServiceTestContext,
  mockExtracted,
  type EvaluateServiceTestContext,
} from './evaluate.service.spec-support';
import { EvaluateService } from './evaluate.service';

describe('EvaluateService — resilience', () => {
  let service: EvaluateService;
  let extractionService: ExtractionService;
  let llmCompleteJSON: EvaluateServiceTestContext['llmCompleteJSON'];

  beforeEach(async () => {
    ({ service, extractionService, llmCompleteJSON } =
      await createEvaluateServiceTestContext());
  });

  it('derivedContext is populated from evaluate-derived-context LLM call', async () => {
    const self = mockExtracted('self', 0.7, 10);
    const partner = mockExtracted('partner', 0.7, 10);
    const relationship = mockExtracted('relationship', 0.7, 8);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });

    llmCompleteJSON.mockImplementation(async ({ purpose }: { purpose: string }) => {
      if (purpose === 'evaluate-summary') {
        return { value: { summary: 'Summary.', insight: 'Insight.' } };
      }
      if (purpose === 'evaluate-motivation') {
        return {
          value: {
            relationshipMotivation: 'emotional_connection',
            confidence: 0.8,
            evidence: [],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
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
            confidence: 0.7,
            evidence: [],
          },
        };
      }
      if (purpose === 'evaluate-derived-context') {
        return {
          value: {
            occupationClass: 'SHIFT_UNPREDICTABLE',
            visibilityNeed: 2,
            lifeStage: 8,
            confidence: 0.9,
            evidence: ['night shift'],
          },
        };
      }
      return { value: {} };
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'Night shift nurse.',
      aboutRelationship: 'Stable partnership.',
      aboutPartner: 'Kind partner.',
    });

    expect(result.derivedContext).toEqual({
      version: 'v1',
      occupationClass: 'SHIFT_UNPREDICTABLE',
      visibilityNeed: 2,
      lifeStage: 8,
      confidence: 0.9,
      evidence: ['night shift'],
    });
  });

  it('evaluateBatch succeeds without derivedContext when derived-context LLM fails', async () => {
    const self = mockExtracted('self', 0.7, 10);
    const partner = mockExtracted('partner', 0.7, 10);
    const relationship = mockExtracted('relationship', 0.7, 8);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });

    llmCompleteJSON.mockImplementation(async ({ purpose }: { purpose: string }) => {
      if (purpose === 'evaluate-derived-context') {
        throw new Error('LLM timeout');
      }
      if (purpose === 'evaluate-summary') {
        return { value: { summary: 'Summary.', insight: 'Insight.' } };
      }
      if (purpose === 'evaluate-motivation') {
        return {
          value: {
            relationshipMotivation: 'emotional_connection',
            confidence: 0.8,
            evidence: [],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
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
            confidence: 0.7,
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'Text.',
      aboutRelationship: 'Text.',
      aboutPartner: 'Text.',
    });

    expect(result.derivedContext).toBeUndefined();
    expect(result.self).toBeDefined();
  });
});
