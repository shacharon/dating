/**
 * Sub-split from evaluate.service.spec.ts (Sprint 69 Story 04).
 * extendedSignals sidecars + sidecar-only productScores proof
 */
import { ExtractionService } from '../extraction/extraction.service';
import {
  createEvaluateServiceTestContext,
  mockExtracted,
  type EvaluateServiceTestContext,
} from './evaluate.service.spec-support';
import { EvaluateService } from './evaluate.service';

describe('EvaluateService — extended signals', () => {
  let service: EvaluateService;
  let extractionService: ExtractionService;
  let llmCompleteJSON: EvaluateServiceTestContext['llmCompleteJSON'];

  beforeEach(async () => {
    ({ service, extractionService, llmCompleteJSON } =
      await createEvaluateServiceTestContext());
  });

  it('extendedSignals are populated with relationshipMotivation and attractionTraits', async () => {
    const self = mockExtracted('self', 0.7, 10);
    const partner = mockExtracted('partner', 0.7, 10);
    const relationship = mockExtracted('relationship', 0.7, 8);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });

    let callCount = 0;
    llmCompleteJSON.mockImplementation(async ({ purpose }: { purpose: string }) => {
      callCount++;
      if (purpose === 'evaluate-summary') {
        return { value: { summary: 'Summary.', insight: 'Insight.' } };
      }
      if (purpose === 'evaluate-motivation') {
        return {
          value: {
            relationshipMotivation: 'emotional_connection',
            confidence: 0.8,
            evidence: ['quote 1', 'quote 2'],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
          value: {
            attraction: {
              ambition: 7,
              statusOrientation: 4,
              physicalPriority: 6,
              kindnessWarmth: 9,
              stabilityReliability: 8,
              independenceAutonomy: 5,
              emotionalDepth: 8,
              traditionalismValues: 3,
              financialPrudence: 6,
            },
            confidence: 0.75,
            evidence: [
              { dimension: 'kindnessWarmth', quote: 'kind and warm person' },
              { dimension: 'emotionalDepth', quote: 'emotionally available' },
            ],
          },
        };
      }
      return { value: {} };
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'Detailed self text.',
      aboutRelationship: 'Relationship text.',
      aboutPartner: 'Partner text.',
    });

    expect(result.extendedSignals).toBeDefined();
    expect(result.extendedSignals?.version).toBe('v1');
    expect(Array.isArray(result.extendedSignals?.interests)).toBe(true);
    expect(Array.isArray(result.extendedSignals?.lifestyleTraits)).toBe(true);
    expect(Array.isArray(result.extendedSignals?.preferences)).toBe(true);
    expect(Array.isArray(result.extendedSignals?.boundaries)).toBe(true);
    expect(Array.isArray(result.extendedSignals?.values)).toBe(true);
    expect(result.extendedSignals?.relationshipMotivation).toBeDefined();
    expect(result.extendedSignals?.relationshipMotivation?.relationshipMotivation).toBe(
      'emotional_connection',
    );
    expect(result.extendedSignals?.relationshipMotivation?.confidence).toBe(0.8);
    expect(result.extendedSignals?.attractionTraits).toBeDefined();
    expect(result.extendedSignals?.attractionTraits?.attraction.kindnessWarmth).toBe(9);
    expect(result.extendedSignals?.attractionTraits?.attraction.emotionalDepth).toBe(8);
    expect(result.extendedSignals?.attractionTraits?.confidence).toBe(0.75);
  });

  it('extendedSignals explicit lists are concrete, deduped across arrays, max 5 each', async () => {
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
            confidence: 0.7,
            evidence: ['deep connection'],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
          value: {
            attraction: {
              ambition: 7,
              statusOrientation: 4,
              physicalPriority: 5,
              kindnessWarmth: 8,
              stabilityReliability: 7,
              independenceAutonomy: 5,
              emotionalDepth: 8,
              traditionalismValues: 4,
              financialPrudence: 5,
            },
            confidence: 0.75,
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const { result } = await service.evaluateBatch({
      aboutMe:
        'Gym, walking, journaling. Reflective and health-oriented. Honesty and growth matter.',
      aboutRelationship:
        'I want emotional safety, no drama, and not rushed pacing. Honest communication matters.',
      aboutPartner:
        'I prefer emotional maturity and clear communication with strong connection.',
    });

    const ext = result.extendedSignals;
    expect(ext).toBeDefined();
    expect(ext?.interests).toEqual(
      expect.arrayContaining(['gym', 'walking', 'journaling']),
    );
    expect(ext?.lifestyleTraits).toEqual(
      expect.arrayContaining(['health oriented', 'reflective']),
    );
    expect(ext?.preferences).toEqual(
      expect.arrayContaining(['emotional maturity']),
    );
    // "clear communication" shares semantic bucket with "honest communication"; boundaries win first.
    expect(ext?.preferences).not.toContain('clear communication');
    expect(ext?.boundaries).toEqual(
      expect.arrayContaining(['not rushed', 'no drama', 'emotional safety', 'honest communication']),
    );
    expect(ext?.values?.length ?? 0).toBe(0);

    for (const arr of [
      ext?.interests ?? [],
      ext?.lifestyleTraits ?? [],
      ext?.preferences ?? [],
      ext?.boundaries ?? [],
      ext?.values ?? [],
    ]) {
      expect(arr.length).toBeLessThanOrEqual(5);
      for (const item of arr) {
        expect(item.trim().split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(1);
        expect(item.trim().split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('explicit extended lists: recall phrases for interests, values, boundaries, lifestyle', async () => {
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
            confidence: 0.7,
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
      aboutMe:
        'I read nightly. I read, garden on weekends. I restore old doors. I build furniture on weekends.',
      aboutPartner: 'Family is everything. I give to causes. I am a high-school teacher.',
      aboutRelationship:
        'I want children. No games. Not into performance. I am spontaneous. A quiet home matters.',
    });

    const ext = result.extendedSignals;
    expect(ext?.interests).toEqual(
      expect.arrayContaining(['reading', 'gardening', 'restoration', 'woodworking']),
    );
    expect(ext?.values).toEqual(
      expect.arrayContaining(['family first', 'giving', 'education']),
    );
    expect(ext?.boundaries).toEqual(
      expect.arrayContaining(['wants children', 'no games', 'authenticity']),
    );
    expect(ext?.lifestyleTraits).toEqual(
      expect.arrayContaining(['spontaneous', 'home oriented']),
    );
  });

  it('productScores remain unchanged when extendedSignals are present (sidecar-only proof)', async () => {
    const self = mockExtracted('self', 0.7, 10);
    const partner = mockExtracted('partner', 0.7, 10);
    const relationship = mockExtracted('relationship', 0.7, 8);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });

    let withExtendedSignalsCallCount = 0;
    llmCompleteJSON.mockImplementation(async ({ purpose }: { purpose: string }) => {
      withExtendedSignalsCallCount++;
      if (purpose === 'evaluate-summary') {
        return { value: { summary: 'Summary.', insight: 'Insight.' } };
      }
      if (purpose === 'evaluate-motivation') {
        return {
          value: {
            relationshipMotivation: 'family_builder',
            confidence: 0.9,
            evidence: ['wants kids', 'family oriented'],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
          value: {
            attraction: {
              ambition: 8,
              statusOrientation: 5,
              physicalPriority: 7,
              kindnessWarmth: 9,
              stabilityReliability: 9,
              independenceAutonomy: 4,
              emotionalDepth: 7,
              traditionalismValues: 6,
              financialPrudence: 7,
            },
            confidence: 0.85,
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const { result: withExtended } = await service.evaluateBatch({
      aboutMe: 'Detailed self text.',
      aboutRelationship: 'Relationship text.',
      aboutPartner: 'Partner text.',
    });

    // Now run again but simulate extended signals failing (to get baseline without extendedSignals)
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });

    let withoutExtendedSignalsCallCount = 0;
    llmCompleteJSON.mockImplementation(async ({ purpose }: { purpose: string }) => {
      withoutExtendedSignalsCallCount++;
      if (purpose === 'evaluate-summary') {
        return { value: { summary: 'Summary.', insight: 'Insight.' } };
      }
      // Simulate failure for extended signals
      if (purpose === 'evaluate-motivation' || purpose === 'evaluate-attraction-traits') {
        throw new Error('Simulated extended signals failure');
      }
      return { value: {} };
    });

    const { result: withoutExtended } = await service.evaluateBatch({
      aboutMe: 'Detailed self text.',
      aboutRelationship: 'Relationship text.',
      aboutPartner: 'Partner text.',
    });

    // PROOF: productScores are identical regardless of extendedSignals presence
    expect(withExtended.productScores).toEqual(withoutExtended.productScores);
    expect(withExtended.productScores.partnerFitScore).toBe(
      withoutExtended.productScores.partnerFitScore,
    );
    expect(withExtended.productScores.relationshipFitScore).toBe(
      withoutExtended.productScores.relationshipFitScore,
    );
    expect(withExtended.productScores.coverageScore).toBe(
      withoutExtended.productScores.coverageScore,
    );
    expect(withExtended.productScores.frictionRiskScore).toBe(
      withoutExtended.productScores.frictionRiskScore,
    );
    expect(withExtended.productScores.overallDecisionScore).toBe(
      withoutExtended.productScores.overallDecisionScore,
    );

    // Verify extendedSignals sidecar is always present; inferred LLM parts may be absent on failure
    expect(withExtended.extendedSignals).toBeDefined();
    expect(withoutExtended.extendedSignals).toBeDefined();
    expect(withoutExtended.extendedSignals?.relationshipMotivation).toBeUndefined();
    expect(withoutExtended.extendedSignals?.attractionTraits).toBeUndefined();
  });

});
