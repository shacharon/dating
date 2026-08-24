/**
 * Sub-split from evaluate.service.spec.ts (Sprint 69 Story 04).
 * chips display-only sidecar
 */
import { ExtractionService } from '../extraction/extraction.service';
import {
  createEvaluateServiceTestContext,
  mockExtracted,
  type EvaluateServiceTestContext,
} from './evaluate.service.spec-support';
import { EvaluateService } from './evaluate.service';

describe('EvaluateService — chips', () => {
  let service: EvaluateService;
  let extractionService: ExtractionService;
  let llmCompleteJSON: EvaluateServiceTestContext['llmCompleteJSON'];

  beforeEach(async () => {
    ({ service, extractionService, llmCompleteJSON } =
      await createEvaluateServiceTestContext());
  });

  it('chips are populated from rawInterests and extendedSignals', async () => {
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
            relationshipMotivation: 'family_builder',
            confidence: 0.9,
            evidence: ['wants kids'],
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
              stabilityReliability: 8,
              independenceAutonomy: 4,
              emotionalDepth: 9,
              traditionalismValues: 3,
              financialPrudence: 6,
            },
            confidence: 0.8,
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const rawInterests = {
      version: 'v1' as const,
      self: [
        { tag: 'gym' as const, strength: 'explicit' as const, ruleId: 'llm_v1' },
        { tag: 'hiking' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
      ],
      partner: [
        { tag: 'cooking' as const, strength: 'explicit' as const, ruleId: 'llm_v1' },
      ],
      relationship: [
        { tag: 'home_life' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
      ],
    };

    const { result } = await service.evaluateBatch({
      aboutMe: 'I love fitness.',
      aboutRelationship: 'Family first.',
      aboutPartner: 'Kind person.',
      rawInterests,
    });

    expect(result.chips).toBeDefined();
    expect(result.chips?.self.length).toBeGreaterThan(0);
    expect(result.chips?.partner.length).toBeGreaterThan(0);
    expect(result.chips?.relationship.length).toBeGreaterThan(0);

    // Verify interest chips
    const selfLabels = result.chips?.self.map((c) => c.label) ?? [];
    expect(selfLabels).toContain('Fitness');

    // Verify trait chips
    const partnerLabels = result.chips?.partner.map((c) => c.label) ?? [];
    expect(partnerLabels).toContain('Cooking'); // from interests
    expect(partnerLabels).toContain('Kind & Warm'); // from attractionTraits

    // Verify motivation chips
    const relationshipLabels = result.chips?.relationship.map((c) => c.label) ?? [];
    expect(relationshipLabels).toContain('Home Comfort'); // from interests
    expect(relationshipLabels).toContain('Family Builder'); // from motivation
  });

  it('productScores remain unchanged when chips are present (display-only proof)', async () => {
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
            confidence: 0.85,
            evidence: [],
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
              stabilityReliability: 7,
              independenceAutonomy: 5,
              emotionalDepth: 8,
              traditionalismValues: 3,
              financialPrudence: 5,
            },
            confidence: 0.75,
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const rawInterests = {
      version: 'v1' as const,
      self: [
        { tag: 'yoga' as const, strength: 'explicit' as const, ruleId: 'llm_v1' },
        { tag: 'books' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
      ],
      partner: [
        { tag: 'travel' as const, strength: 'explicit' as const, ruleId: 'llm_v1' },
      ],
      relationship: [
        { tag: 'movies' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
      ],
    };

    // Run with rawInterests and chips
    const { result: withChips } = await service.evaluateBatch({
      aboutMe: 'Yoga enthusiast.',
      aboutRelationship: 'Movie nights.',
      aboutPartner: 'Travel lover.',
      rawInterests,
    });

    // Run without rawInterests (no chips from interests)
    const { result: withoutChips } = await service.evaluateBatch({
      aboutMe: 'Yoga enthusiast.',
      aboutRelationship: 'Movie nights.',
      aboutPartner: 'Travel lover.',
    });

    // PROOF: productScores are identical regardless of chips presence
    expect(withChips.productScores).toEqual(withoutChips.productScores);
    expect(withChips.productScores.partnerFitScore).toBe(
      withoutChips.productScores.partnerFitScore,
    );
    expect(withChips.productScores.relationshipFitScore).toBe(
      withoutChips.productScores.relationshipFitScore,
    );
    expect(withChips.productScores.coverageScore).toBe(
      withoutChips.productScores.coverageScore,
    );
    expect(withChips.productScores.frictionRiskScore).toBe(
      withoutChips.productScores.frictionRiskScore,
    );
    expect(withChips.productScores.overallDecisionScore).toBe(
      withoutChips.productScores.overallDecisionScore,
    );

    // Verify chips are present in first case
    expect(withChips.chips).toBeDefined();
    expect(withChips.chips?.self.length).toBeGreaterThan(0);
    expect(withChips.chips?.partner.length).toBeGreaterThan(0);
    expect(withChips.chips?.relationship.length).toBeGreaterThan(0);

    // Verify chips are present in second case too (from extendedSignals fallback)
    expect(withoutChips.chips).toBeDefined();
  });

  it('chips respect max 5 per domain', async () => {
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
            relationshipMotivation: 'family_builder',
            confidence: 0.9,
            evidence: [],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
          value: {
            attraction: {
              ambition: 9,
              statusOrientation: 8,
              physicalPriority: 9,
              kindnessWarmth: 10,
              stabilityReliability: 9,
              independenceAutonomy: 8,
              emotionalDepth: 9,
              traditionalismValues: 8,
              financialPrudence: 9,
            },
            confidence: 0.9,
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const rawInterests = {
      version: 'v1' as const,
      self: [
        { tag: 'gym' as const, strength: 'explicit' as const, ruleId: 'llm_v1' },
        { tag: 'hiking' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
        { tag: 'yoga' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
        { tag: 'cooking' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
        { tag: 'travel' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
        { tag: 'books' as const, strength: 'strong' as const, ruleId: 'llm_v1' },
      ],
      partner: [],
      relationship: [],
    };

    const { result } = await service.evaluateBatch({
      aboutMe: 'Many hobbies.',
      aboutRelationship: 'Active life.',
      aboutPartner: 'Kind.',
      rawInterests,
    });

    expect(result.chips?.self.length).toBeLessThanOrEqual(5);
    expect(result.chips?.partner.length).toBeLessThanOrEqual(5);
    expect(result.chips?.relationship.length).toBeLessThanOrEqual(5);
  });

  it('empty inputs produce empty chips arrays', async () => {
    const self = mockExtracted('self', 0.7, 0); // no signals
    const partner = mockExtracted('partner', 0.7, 0);
    const relationship = mockExtracted('relationship', 0.7, 0);
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
            confidence: 0.3, // too low
            evidence: [],
          },
        };
      }
      if (purpose === 'evaluate-attraction-traits') {
        return {
          value: {
            attraction: {
              ambition: 2,
              statusOrientation: 3,
              physicalPriority: 4,
              kindnessWarmth: 5,
              stabilityReliability: 6,
              independenceAutonomy: 4,
              emotionalDepth: 5,
              traditionalismValues: 2,
              financialPrudence: 3,
            },
            confidence: 0.4, // too low
            evidence: [],
          },
        };
      }
      return { value: {} };
    });

    const { result } = await service.evaluateBatch({
      aboutMe: '',
      aboutRelationship: '',
      aboutPartner: '',
    });

    expect(result.chips).toBeDefined();
    expect(result.chips?.self).toEqual([]);
    expect(result.chips?.partner).toEqual([]);
    expect(result.chips?.relationship).toEqual([]);
  });
});
