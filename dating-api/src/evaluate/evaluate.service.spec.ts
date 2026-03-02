import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import { LLMRouterService } from '../llm/llm-router.service';
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
    evidence: keys.slice(0, nonNullCount).map((signal) => ({ signal, quote: 'quote' })),
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

    expect(Array.isArray(result.flags)).toBe(true);
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
});
