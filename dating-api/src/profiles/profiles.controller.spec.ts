import { BadRequestException } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import type { EvaluateService } from '../evaluate/evaluate.service';
import type { SimpleLogger } from '../logger/simple-logger.service';

describe('ProfilesController', () => {
  const mockEvaluation = {
    self: { domain: 'self', signals: {}, evidence: [], version: 'v1', confidence: 0 },
    partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0 },
    relationship: {
      domain: 'relationship',
      signals: {},
      evidence: [],
      version: 'v1',
      confidence: 0,
    },
    compatibility: {
      selfVsPartner: {
        overallScore: 0,
        coverage: 0,
        matchedSignals: 0,
        hardMismatches: [],
        breakdown: [],
      },
      selfVsRelationship: {
        overallScore: 0,
        coverage: 0,
        matchedSignals: 0,
        hardMismatches: [],
        breakdown: [],
      },
    },
    display: { summary: 'ok', insight: '' },
    productScores: {
      partnerFitScore: 0,
      relationshipFitScore: 0,
      coverageScore: 0,
      frictionRiskScore: 0,
      overallDecisionScore: 0,
      policyVersion: 'product-score-v1',
    },
    productScoresPresentation: {
      partnerFitScore: { kind: 'insufficient_data' as const },
      relationshipFitScore: { kind: 'insufficient_data' as const },
      coverageScore: { kind: 'insufficient_data' as const },
      frictionRiskScore: { kind: 'insufficient_data' as const },
      overallDecisionScore: { kind: 'insufficient_data' as const },
    },
    flags: [],
    chips: { self: [], partner: [], relationship: [] },
  };

  const evaluateService = {
    evaluateBatch: jest.fn(),
  } as unknown as EvaluateService;

  const logger = {
    log: jest.fn(),
  } as unknown as SimpleLogger;

  let controller: ProfilesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProfilesController(evaluateService, logger);
    (evaluateService.evaluateBatch as jest.Mock).mockResolvedValue({
      ok: true,
      result: mockEvaluation,
    });
  });

  it('POST evaluate returns evaluation JSON without persisting', async () => {
    const result = await controller.evaluate({
      name: 'River',
      aboutMe: 'About me text here.',
      aboutPartner: 'About partner text here.',
      aboutRelationship: 'About relationship text here.',
    });

    expect(result.ok).toBe(true);
    expect(result.evaluation).toBe(mockEvaluation);
    expect(typeof result.profileId).toBe('string');
    expect(evaluateService.evaluateBatch).toHaveBeenCalledWith({
      aboutMe: 'About me text here.',
      aboutPartner: 'About partner text here.',
      aboutRelationship: 'About relationship text here.',
    });
  });

  it('rejects empty name', async () => {
    await expect(
      controller.evaluate({
        name: '  ',
        aboutMe: 'a',
        aboutPartner: 'b',
        aboutRelationship: 'c',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
