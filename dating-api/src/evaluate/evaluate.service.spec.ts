import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import { LLMRouterService } from '../llm/llm-router.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { EvaluateService } from './evaluate.service';

function lowCoverageSignals(overrides: Partial<Record<string, number | null>> = {}): Record<string, number | null> {
  const signals: Record<string, number | null> = {};
  for (const k of [
    'ambition', 'socialBattery', 'healthBodyConsciousness', 'emotionalDepth',
    'attachmentSecurity', 'directness', 'independence', 'traditionalism',
    'financialMindset', 'relationshipClarity', 'spirituality', 'lifestylePace',
    'physicalPriority', 'statusOrientation',
  ]) {
    signals[k] = overrides[k] ?? null;
  }
  return signals;
}

function mockExtracted(domain: 'self' | 'partner' | 'relationship', confidence: number, nonNullCount: number): ExtractedSignals {
  const keys = Object.keys(lowCoverageSignals());
  const signals = lowCoverageSignals({});
  for (let i = 0; i < nonNullCount && i < keys.length; i++) {
    signals[keys[i]] = 5;
  }
  return {
    domain,
    signals,
    evidence: keys
      .slice(0, nonNullCount)
      .map((signal) => ({ signal, quote: 'quote', reason: 'Synthetic test reason' })),
    version: 'v1',
    confidence,
  };
}

describe('EvaluateService', () => {
  let service: EvaluateService;
  let extractionService: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  beforeEach(async () => {
    llmCompleteJSON = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateService,
        {
          provide: ExtractionService,
          useValue: {
            extractAllThree: jest.fn(),
          },
        },
        {
          provide: LLMRouterService,
          useValue: { completeJSON: llmCompleteJSON },
        },
        {
          provide: SimpleLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EvaluateService>(EvaluateService);
    extractionService = module.get<ExtractionService>(ExtractionService);
  });

  it('display uses cautious language when coverage and confidence are low', async () => {
    const self = mockExtracted('self', 0.35, 2);
    const partner = mockExtracted('partner', 0.4, 1);
    const relationship = mockExtracted('relationship', 0.35, 1);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: {
        summary: 'The person values connection and openness.',
        insight: 'Self and partner show some alignment.',
      },
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'nice person',
      aboutRelationship: 'good vibes',
      aboutPartner: 'fun',
    });

    expect(result.display.summary).toMatch(/^Based on limited information/);
    expect(result.display.summary).toMatch(/may suggest tendencies/);
    expect(result.display.insight).toMatch(/^Limited signal/);
    expect(result.display.note).toBe(
      'Limited information provided; score confidence is lower.',
    );
  });

  it('rich high-confidence case remains direct; no cautious wording or note', async () => {
    const self = mockExtracted('self', 0.8, 12);
    const partner = mockExtracted('partner', 0.8, 12);
    const relationship = mockExtracted('relationship', 0.8, 10);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: {
        summary: 'The person is driven and values emotional depth.',
        insight: 'Self and partner align on key dimensions.',
      },
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'Detailed self.',
      aboutRelationship: 'Relationship.',
      aboutPartner: 'Partner.',
    });

    expect(result.display.summary).not.toMatch(/^Based on limited information/);
    expect(result.display.summary).not.toMatch(/may suggest tendencies/);
    expect(result.display.insight).not.toMatch(/^Limited signal/);
    expect(result.display.note).toBeUndefined();
  });

  it('response includes all existing fields and new productScores with 0-100 values', async () => {
    const self = mockExtracted('self', 0.7, 10);
    const partner = mockExtracted('partner', 0.7, 10);
    const relationship = mockExtracted('relationship', 0.7, 8);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: { summary: 'A summary.', insight: 'An insight.' },
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'Detailed self text.',
      aboutRelationship: 'Relationship text.',
      aboutPartner: 'Partner text.',
    });

    expect(result.self).toBeDefined();
    expect(result.partner).toBeDefined();
    expect(result.relationship).toBeDefined();
    expect(result.compatibility).toBeDefined();
    expect(result.compatibility.selfVsPartner).toBeDefined();
    expect(result.compatibility.selfVsRelationship).toBeDefined();
    expect(result.display).toBeDefined();
    expect(result.display.summary).toBeDefined();
    expect(result.display.insight).toBeDefined();

    expect(result.productScores).toBeDefined();
    expect(result.productScores.partnerFitScore).toBeGreaterThanOrEqual(0);
    expect(result.productScores.partnerFitScore).toBeLessThanOrEqual(100);
    expect(result.productScores.relationshipFitScore).toBeGreaterThanOrEqual(0);
    expect(result.productScores.relationshipFitScore).toBeLessThanOrEqual(100);
    expect(result.productScores.coverageScore).toBeGreaterThanOrEqual(0);
    expect(result.productScores.coverageScore).toBeLessThanOrEqual(100);
    expect(result.productScores.frictionRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.productScores.frictionRiskScore).toBeLessThanOrEqual(100);
    expect(result.productScores.overallDecisionScore).toBeGreaterThanOrEqual(0);
    expect(result.productScores.overallDecisionScore).toBeLessThanOrEqual(100);
    expect(result.productScores.policyVersion).toBe('product-score-v1');

    expect(result.productScoresPresentation).toBeDefined();
    expect(result.productScoresPresentation.partnerFitScore.kind).toBe('numeric');
    expect(result.productScoresPresentation.relationshipFitScore.kind).toBe('numeric');
    expect(result.productScoresPresentation.coverageScore.kind).toBe('numeric');
    expect(result.productScoresPresentation.frictionRiskScore.kind).toBe('numeric');
    expect(result.productScoresPresentation.overallDecisionScore.kind).toBe('numeric');

    expect(Array.isArray(result.flags)).toBe(true);
  });

  it('productScoresPresentation withholds fit and aggregate scores when a domain is not OK', async () => {
    const self = mockExtracted('self', 0.7, 10);
    const partner = mockExtracted('partner', 0.4, 1);
    const relationship = mockExtracted('relationship', 0.7, 8);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: { summary: 'Summary.', insight: 'Insight.' },
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'x',
      aboutRelationship: 'y',
      aboutPartner: 'z',
    });

    expect(result.productScores.partnerFitScore).toBeGreaterThanOrEqual(0);
    expect(result.productScoresPresentation.partnerFitScore).toEqual({
      kind: 'insufficient_data',
    });
    expect(result.productScoresPresentation.coverageScore).toEqual({
      kind: 'insufficient_data',
    });
    expect(result.productScoresPresentation.overallDecisionScore).toEqual({
      kind: 'insufficient_data',
    });
    expect(result.productScoresPresentation.frictionRiskScore.kind).toBe('numeric');
  });

  it('productScores are deterministic for same extracted inputs', async () => {
    const self = mockExtracted('self', 0.6, 6);
    const partner = mockExtracted('partner', 0.6, 6);
    const relationship = mockExtracted('relationship', 0.6, 6);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: { summary: 'Summary.', insight: 'Insight.' },
    });

    const { result: a } = await service.evaluateBatch({
      aboutMe: 'x',
      aboutRelationship: 'y',
      aboutPartner: 'z',
    });
    const { result: b } = await service.evaluateBatch({
      aboutMe: 'x',
      aboutRelationship: 'y',
      aboutPartner: 'z',
    });

    expect(a.productScores.partnerFitScore).toBe(b.productScores.partnerFitScore);
    expect(a.productScores.relationshipFitScore).toBe(b.productScores.relationshipFitScore);
    expect(a.productScores.coverageScore).toBe(b.productScores.coverageScore);
    expect(a.productScores.frictionRiskScore).toBe(b.productScores.frictionRiskScore);
    expect(a.productScores.overallDecisionScore).toBe(b.productScores.overallDecisionScore);
  });

  it('low coverage + moderate fit produces capped overallDecisionScore (LOW_COVERAGE respected)', async () => {
    const self = mockExtracted('self', 0.6, 2);
    const partner = mockExtracted('partner', 0.6, 2);
    const relationship = mockExtracted('relationship', 0.6, 2);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: { summary: 'Summary.', insight: 'Insight.' },
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'x',
      aboutRelationship: 'y',
      aboutPartner: 'z',
    });

    expect(result.flags).toContain('LOW_COVERAGE');
    expect(result.productScores.coverageScore).toBeLessThan(40);
    expect(result.productScores.overallDecisionScore).toBeLessThanOrEqual(49);
  });

  it('high coverage case is not over-penalized; overall can be high', async () => {
    const self = mockExtracted('self', 0.7, 12);
    const partner = mockExtracted('partner', 0.7, 12);
    const relationship = mockExtracted('relationship', 0.7, 10);
    jest.spyOn(extractionService, 'extractAllThree').mockResolvedValue({
      self,
      partner,
      relationship,
    });
    llmCompleteJSON.mockResolvedValue({
      value: { summary: 'Summary.', insight: 'Insight.' },
    });

    const { result } = await service.evaluateBatch({
      aboutMe: 'Detailed text.',
      aboutRelationship: 'Relationship.',
      aboutPartner: 'Partner.',
    });

    expect(result.productScores.coverageScore).toBeGreaterThanOrEqual(55);
    expect(result.flags).not.toContain('LOW_COVERAGE');
    expect(result.productScores.overallDecisionScore).toBeGreaterThanOrEqual(60);
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

  it('extendedSignals explicit lists are extracted with 1-3 words and max 10', async () => {
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
        'Gym, walking, journaling. I am balanced, reflective, health-oriented. Honesty and growth matter.',
      aboutRelationship:
        'I want emotional safety, no drama, and not rushed pacing.',
      aboutPartner:
        'I prefer emotional maturity and clear communication with strong connection.',
    });

    const ext = result.extendedSignals;
    expect(ext).toBeDefined();
    expect(ext?.interests).toEqual(
      expect.arrayContaining(['gym', 'walking', 'journaling']),
    );
    expect(ext?.lifestyleTraits).toEqual(
      expect.arrayContaining(['balanced', 'reflective', 'health oriented']),
    );
    expect(ext?.preferences).toEqual(
      expect.arrayContaining(['emotional maturity', 'clear communication']),
    );
    expect(ext?.boundaries).toEqual(
      expect.arrayContaining(['not rushed', 'no drama', 'emotional safety']),
    );
    expect(ext?.values).toEqual(expect.arrayContaining(['honesty', 'growth', 'connection']));

    for (const arr of [
      ext?.interests ?? [],
      ext?.lifestyleTraits ?? [],
      ext?.preferences ?? [],
      ext?.boundaries ?? [],
      ext?.values ?? [],
    ]) {
      expect(arr.length).toBeLessThanOrEqual(10);
      for (const item of arr) {
        expect(item.trim().split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(1);
        expect(item.trim().split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(3);
      }
    }
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
