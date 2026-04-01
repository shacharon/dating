import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import { EvaluateService } from '../evaluate/evaluate.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import type { ProfileJsonPayload } from './profiles-json.service';
import { ProfilesPrismaService } from './profiles-prisma.service';
import { AnalysisCacheService } from './analysis-cache.service';
import { AnalyzeFailuresPersistenceService } from './analyze-failures-persistence.service';
import { ProfilesAnalyzeController } from './profiles-analyze.controller';
import { ExtractionV2Service } from '../extraction/extraction-v2.service';
import { ExtractionV2PersistenceService } from '../extraction/extraction-v2-persistence.service';
import type { ExtractionV2Result } from '../extraction/extraction-v2.service';

function mockEvalResult(overrides?: { summary?: string }): EvaluateBatchResult {
  return {
    self: {
      domain: 'self',
      signals: { ambition: 8, socialBattery: 6, emotionalDepth: 7 },
      evidence: [{ signal: 'ambition', quote: 'driven', reason: 'Shows ambition drive' }],
      version: 'v1',
      confidence: 0.7,
    },
    partner: {
      domain: 'partner',
      signals: {},
      evidence: [],
      version: 'v1',
      confidence: 0.5,
    },
    relationship: {
      domain: 'relationship',
      signals: {},
      evidence: [],
      version: 'v1',
      confidence: 0.5,
    },
    compatibility: {
      selfVsPartner: {
        overallScore: 50,
        coverage: 0,
        matchedSignals: 0,
        hardMismatches: [],
        breakdown: [],
      },
      selfVsRelationship: {
        overallScore: 50,
        coverage: 0,
        matchedSignals: 0,
        hardMismatches: [],
        breakdown: [],
      },
    },
    display: { summary: overrides?.summary ?? 'Test summary', insight: 'Test insight' },
    productScores: {
      partnerFitScore: 50,
      relationshipFitScore: 50,
      coverageScore: 30,
      frictionRiskScore: 0,
      overallDecisionScore: 40,
      policyVersion: 'product-score-v1',
    },
    productScoresPresentation: {
      partnerFitScore: { kind: 'insufficient_data' },
      relationshipFitScore: { kind: 'insufficient_data' },
      coverageScore: { kind: 'insufficient_data' },
      frictionRiskScore: { kind: 'numeric', value: 0 },
      overallDecisionScore: { kind: 'insufficient_data' },
    },
    flags: [],
  } as EvaluateBatchResult;
}

/** Eval result with v1 domains but no non-null signals (hasAnalyzedSignalsV1 = false). */
function mockEvalResultUnanalyzed(): EvaluateBatchResult {
  return {
    self: { domain: 'self', signals: {}, evidence: [], version: 'v1', confidence: 0 },
    partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0 },
    relationship: { domain: 'relationship', signals: {}, evidence: [], version: 'v1', confidence: 0 },
    compatibility: {
      selfVsPartner: { overallScore: 50, coverage: 0, matchedSignals: 0, hardMismatches: [], breakdown: [] },
      selfVsRelationship: { overallScore: 50, coverage: 0, matchedSignals: 0, hardMismatches: [], breakdown: [] },
    },
    display: { summary: 'Not yet analyzed.', insight: '' },
    productScores: {
      partnerFitScore: 50,
      relationshipFitScore: 50,
      coverageScore: 0,
      frictionRiskScore: 0,
      overallDecisionScore: 40,
      policyVersion: 'product-score-v1',
    },
    productScoresPresentation: {
      partnerFitScore: { kind: 'insufficient_data' },
      relationshipFitScore: { kind: 'insufficient_data' },
      coverageScore: { kind: 'insufficient_data' },
      frictionRiskScore: { kind: 'numeric', value: 0 },
      overallDecisionScore: { kind: 'insufficient_data' },
    },
    flags: [],
  } as EvaluateBatchResult;
}

function mockProfile(id: string, name: string, evalOverrides?: { summary?: string }): ProfileJsonPayload {
  return {
    id,
    name,
    texts: { aboutMe: 'about me text', aboutPartner: 'about partner text', aboutRelationship: 'about relationship text' },
    evaluation: mockEvalResult(evalOverrides),
    savedAt: new Date().toISOString(),
  } as ProfileJsonPayload;
}

function mockExtractionV2Result(): ExtractionV2Result {
  return {
    version: 'v2',
    extractedAt: new Date().toISOString(),
    base: {
      self: {
        domain: 'self',
        signals: { emotionalDepth: 8, socialBattery: 2 },
        rawInterests: ['hiking', 'travel'],
        softNo: ['smoking'],
        dealbreakers: [],
        evidence: [{ signal: 'socialBattery', quote: 'prefer quiet nights', reason: 'explicit' }],
        version: 'v1',
        confidence: 0.8,
      },
      partner: {
        domain: 'partner',
        signals: { directness: 7 },
        rawInterests: ['books'],
        softNo: [],
        dealbreakers: [],
        evidence: [],
        version: 'v1',
        confidence: 0.7,
      },
      relationship: {
        domain: 'relationship',
        signals: { lifestylePace: 7 },
        rawInterests: [],
        softNo: [],
        dealbreakers: ['dishonesty'],
        evidence: [],
        version: 'v1',
        confidence: 0.7,
      },
    },
    interests: { self: [], partner: [], relationship: [] },
    negatives: { self: [], partner: [], relationship: [] },
    _usage: {
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      estimatedCostUSD: 0.0001,
      durationMs: 10,
    },
    _provenance: {
      extractorVersion: 'test',
      promptHashes: { base: 'a', interests: 'b', negatives: 'c' },
    },
  };
}

describe('ProfilesAnalyzeController', () => {
  let controller: ProfilesAnalyzeController;
  let evaluateBatch: jest.Mock;
  let getById: jest.Mock;
  let list: jest.Mock;
  let save: jest.Mock;
  let cacheGet: jest.Mock;
  let cacheSet: jest.Mock;
  let failuresAppend: jest.Mock;
  let extractAll: jest.Mock;
  let extractionGetByProfileId: jest.Mock;

  beforeEach(async () => {
    evaluateBatch = jest.fn();
    getById = jest.fn();
    list = jest.fn();
    save = jest.fn();
    cacheGet = jest.fn().mockReturnValue(null);
    cacheSet = jest.fn();
    failuresAppend = jest.fn().mockResolvedValue(undefined);
    extractAll = jest.fn();
    extractionGetByProfileId = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesAnalyzeController],
      providers: [
        { provide: EvaluateService, useValue: { evaluateBatch } },
        { provide: ProfilesPrismaService, useValue: { getById, list, save } },
        {
          provide: AnalysisCacheService,
          useValue: {
            get: cacheGet,
            set: cacheSet,
            buildKey: (id: string, textHash: string, pv: string, polv: string) =>
              `analysis:v1:${id}:${pv}:${polv}:${textHash}`,
            clear: jest.fn(),
          },
        },
        { provide: AnalyzeFailuresPersistenceService, useValue: { append: failuresAppend } },
        {
          provide: SimpleLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
        {
          provide: ExtractionV2Service,
          useValue: {
            extractAll,
          },
        },
        {
          provide: ExtractionV2PersistenceService,
          useValue: {
            save: jest.fn(),
            saveExtendedSignalsFromEvaluation: jest.fn(),
            getByProfileId: extractionGetByProfileId,
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProfilesAnalyzeController>(ProfilesAnalyzeController);
  });

  describe('POST /api/profiles/:id/analyze', () => {
    it('returns 200 with profile.signals present', async () => {
      const profile = mockProfile('test-id', 'Test User');
      getById.mockResolvedValue(profile);
      evaluateBatch.mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeOne('test-id');

      expect(result.ok).toBe(true);
      expect(result.profile.id).toBe('test-id');
      expect(result.profile.name).toBe('Test User');
      expect(result.profile.signals).toBeDefined();
      expect(result.profile.signals['ambition']).toBe(8);
      expect(result.profile.signals['socialBattery']).toBe(6);
      expect(result.profile.confidence).toBe(0.7);
      expect(result.profile.updatedAt).toBeDefined();
      expect(save).toHaveBeenCalledTimes(1);
      expect(evaluateBatch).toHaveBeenCalledWith({
        aboutMe: 'about me text',
        aboutRelationship: 'about relationship text',
        aboutPartner: 'about partner text',
        profileId: 'test-id',
      });
    });

    it('throws NotFoundException when profile does not exist', async () => {
      getById.mockResolvedValue(null);

      await expect(controller.analyzeOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(evaluateBatch).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/profiles/analyze-all', () => {
    it('returns summary with analyzed==processed when all succeed', async () => {
      list.mockResolvedValue([
        { id: 'p1', name: 'User 1', savedAt: '2025-01-01' },
        { id: 'p2', name: 'User 2', savedAt: '2025-01-02' },
      ]);
      getById
        .mockResolvedValueOnce({ ...mockProfile('p1', 'User 1'), evaluation: mockEvalResultUnanalyzed() })
        .mockResolvedValueOnce({ ...mockProfile('p2', 'User 2'), evaluation: mockEvalResultUnanalyzed() });
      evaluateBatch.mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeAll();

      expect(result.ok).toBe(true);
      expect(result.profilesTotal).toBe(2);
      expect(result.poolTotal).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.analyzed).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(25);
      expect(result.nextOffset).toBeNull();
      expect(result.done).toBe(true);
      expect(result.failures).toEqual([]);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ evaluationStatus: 'DONE' }),
      );
    });

    it('onlyUnanalyzed=true filters out already-analyzed profiles (stubs only)', async () => {
      list.mockResolvedValue([
        { id: 'stub', name: 'Stub', savedAt: '2025-01-01' },
        { id: 'done', name: 'Done', savedAt: '2025-01-02' },
      ]);
      getById
        .mockResolvedValueOnce({ ...mockProfile('stub', 'Stub'), evaluation: mockEvalResultUnanalyzed() })
        .mockResolvedValueOnce({
          ...mockProfile('done', 'Done', { summary: 'Real summary' }),
          evaluationStatus: 'DONE' as const,
          signals: { ambition: 8 },
          evaluatedAt: new Date().toISOString(),
          promptVersion: 'v1',
          policyVersion: 'product-score-v1',
        });
      evaluateBatch.mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeAll(undefined, undefined, 'true');

      expect(result.profilesTotal).toBe(2);
      expect(result.poolTotal).toBe(1);
      expect(result.processed).toBe(1);
      expect(result.analyzed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith('stub', expect.any(Object));
    });

    it('onlyUnanalyzed=false includes all profiles', async () => {
      list.mockResolvedValue([
        { id: 'p1', name: 'P1', savedAt: '2025-01-01' },
        { id: 'p2', name: 'P2', savedAt: '2025-01-02' },
      ]);
      getById
        .mockResolvedValueOnce({
          ...mockProfile('p1', 'P1', { summary: 'Real' }),
          evaluationStatus: 'DONE' as const,
          signals: { ambition: 8 },
          evaluatedAt: new Date().toISOString(),
          promptVersion: 'v1',
          policyVersion: 'product-score-v1',
        })
        .mockResolvedValueOnce({
          ...mockProfile('p2', 'P2', { summary: 'Real' }),
          evaluationStatus: 'DONE' as const,
          signals: { ambition: 8 },
          evaluatedAt: new Date().toISOString(),
          promptVersion: 'v1',
          policyVersion: 'product-score-v1',
        });
      evaluateBatch.mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeAll(undefined, undefined, 'false');

      expect(result.profilesTotal).toBe(2);
      expect(result.poolTotal).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.analyzed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.skippedUpToDate).toBe(2);
      expect(save).not.toHaveBeenCalled();
    });

    it('nextOffset increments by processed batch (limit/offset)', async () => {
      list.mockResolvedValue([
        { id: 'a', name: 'A', savedAt: '2025-01-01' },
        { id: 'b', name: 'B', savedAt: '2025-01-02' },
        { id: 'c', name: 'C', savedAt: '2025-01-03' },
      ]);
      const unanalyzed = (id: string, name: string) => ({ ...mockProfile(id, name), evaluation: mockEvalResultUnanalyzed() });
      getById
        .mockResolvedValueOnce(unanalyzed('a', 'A'))
        .mockResolvedValueOnce(unanalyzed('b', 'B'))
        .mockResolvedValueOnce(unanalyzed('c', 'C'))
        .mockResolvedValueOnce(unanalyzed('a', 'A'))
        .mockResolvedValueOnce(unanalyzed('b', 'B'))
        .mockResolvedValueOnce(unanalyzed('c', 'C'));
      evaluateBatch.mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const page1 = await controller.analyzeAll('2', '0', 'true');
      expect(page1.profilesTotal).toBe(3);
      expect(page1.poolTotal).toBe(3);
      expect(page1.processed).toBe(2);
      expect(page1.nextOffset).toBe(2);
      expect(page1.done).toBe(false);

      const page2 = await controller.analyzeAll('2', '2', 'true');
      expect(page2.profilesTotal).toBe(3);
      expect(page2.poolTotal).toBe(3);
      expect(page2.processed).toBe(1);
      expect(page2.nextOffset).toBeNull();
      expect(page2.done).toBe(true);
    });

    it('continues on error and reports failures', async () => {
      list.mockResolvedValue([
        { id: 'p1', name: 'User 1', savedAt: '2025-01-01' },
        { id: 'p2', name: 'User 2', savedAt: '2025-01-02' },
      ]);
      getById
        .mockResolvedValueOnce({ ...mockProfile('p1', 'User 1'), evaluation: mockEvalResultUnanalyzed() })
        .mockResolvedValueOnce({ ...mockProfile('p2', 'User 2'), evaluation: mockEvalResultUnanalyzed() });
      evaluateBatch
        .mockResolvedValueOnce({ ok: true, result: mockEvalResult() })
        .mockRejectedValueOnce(new Error('LLM rate limit'));
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeAll();

      expect(result.profilesTotal).toBe(2);
      expect(result.poolTotal).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.analyzed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].profileId).toBe('p2');
      expect(result.failures[0].reason).toBe('LLM rate limit');
      expect(failuresAppend).toHaveBeenCalledWith('p2', 'LLM rate limit');
    });

    it('handles empty profile list', async () => {
      list.mockResolvedValue([]);

      const result = await controller.analyzeAll();

      expect(result.ok).toBe(true);
      expect(result.profilesTotal).toBe(0);
      expect(result.poolTotal).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.analyzed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.nextOffset).toBeNull();
      expect(result.done).toBe(true);
    });

    it('excludes getById null from pool (no failure entry)', async () => {
      list.mockResolvedValue([{ id: 'gone', name: 'Gone', savedAt: '2025-01-01' }]);
      getById.mockResolvedValue(null);

      const result = await controller.analyzeAll();

      expect(result.profilesTotal).toBe(1);
      expect(result.poolTotal).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.analyzed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.failures).toEqual([]);
    });

    it('continueOnError=false stops on first failure', async () => {
      list.mockResolvedValue([
        { id: 'p1', name: 'User 1', savedAt: '2025-01-01' },
        { id: 'p2', name: 'User 2', savedAt: '2025-01-02' },
      ]);
      getById
        .mockResolvedValueOnce({ ...mockProfile('p1', 'User 1'), evaluation: mockEvalResultUnanalyzed() })
        .mockResolvedValueOnce({ ...mockProfile('p2', 'User 2'), evaluation: mockEvalResultUnanalyzed() });
      evaluateBatch.mockRejectedValueOnce(new Error('First error'));
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeAll(undefined, undefined, 'true', undefined, 'false');

      expect(result.processed).toBe(1);
      expect(result.analyzed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failures[0].profileId).toBe('p1');
      expect(result.failures[0].reason).toBe('First error');
      expect(result.nextOffset).toBe(1);
      expect(result.done).toBe(false);
      expect(evaluateBatch).toHaveBeenCalledTimes(1);
      expect(failuresAppend).toHaveBeenCalledWith('p1', 'First error');
    });

    it('maxSeconds stops gracefully and returns nextOffset for resume', async () => {
      list.mockResolvedValue([
        { id: 'a', name: 'A', savedAt: '2025-01-01' },
        { id: 'b', name: 'B', savedAt: '2025-01-02' },
        { id: 'c', name: 'C', savedAt: '2025-01-03' },
      ]);
      const unanalyzed = (id: string, name: string) => ({ ...mockProfile(id, name), evaluation: mockEvalResultUnanalyzed() });
      getById
        .mockResolvedValueOnce(unanalyzed('a', 'A'))
        .mockResolvedValueOnce(unanalyzed('b', 'B'))
        .mockResolvedValueOnce(unanalyzed('c', 'C'));
      evaluateBatch
        .mockImplementationOnce(() => new Promise((r) => setTimeout(() => r({ ok: true, result: mockEvalResult() }), 1200)))
        .mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const result = await controller.analyzeAll('10', '0', 'true', '0', 'true', undefined, '1');

      expect(result.done).toBe(false);
      expect(result.nextOffset).toBe(1);
      expect(result.processed).toBe(1);
      expect(result.analyzed).toBe(1);
    });
  });

  describe('POST /api/profiles/analyze-batch', () => {
    it('resume: second run skips already-analyzed profiles when onlyUnanalyzed=true', async () => {
      list.mockResolvedValue([
        { id: 'a', name: 'A', savedAt: '2025-01-01' },
        { id: 'b', name: 'B', savedAt: '2025-01-02' },
      ]);
      const unanalyzedA = { ...mockProfile('a', 'A'), evaluation: mockEvalResultUnanalyzed() };
      const unanalyzedB = { ...mockProfile('b', 'B'), evaluation: mockEvalResultUnanalyzed() };
      getById
        .mockResolvedValueOnce(unanalyzedA)
        .mockResolvedValueOnce(unanalyzedB)
        .mockResolvedValueOnce({
          ...mockProfile('a', 'A'),
          signals: { ambition: 8 },
          evaluatedAt: new Date().toISOString(),
          promptVersion: 'v1',
          policyVersion: 'product-score-v1',
        })
        .mockResolvedValueOnce({
          ...mockProfile('b', 'B'),
          signals: { ambition: 8 },
          evaluatedAt: new Date().toISOString(),
          promptVersion: 'v1',
          policyVersion: 'product-score-v1',
        });
      evaluateBatch.mockResolvedValue({ ok: true, result: mockEvalResult() });
      save.mockResolvedValue(undefined);

      const first = await controller.analyzeBatch({
        limit: 10,
        offset: 0,
        onlyUnanalyzed: true,
        continueOnError: true,
        delayMs: 0,
      });

      expect(first.ok).toBe(true);
      expect(first.total).toBe(2);
      expect(first.processed).toBe(2);
      expect(first.skipped).toBe(0);
      expect(first.failed).toBe(0);
      expect(first.done).toBe(true);
      expect(save).toHaveBeenCalledTimes(2);
      expect(evaluateBatch).toHaveBeenCalledTimes(2);

      const second = await controller.analyzeBatch({
        limit: 10,
        offset: 0,
        onlyUnanalyzed: true,
        continueOnError: true,
        delayMs: 0,
      });

      expect(second.ok).toBe(true);
      expect(second.total).toBe(0);
      expect(second.processed).toBe(0);
      expect(second.skipped).toBe(0);
      expect(second.failed).toBe(0);
      expect(second.done).toBe(true);
      expect(save).toHaveBeenCalledTimes(2);
      expect(evaluateBatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/profiles/:id/analyze-v2', () => {
    it('returns extraction with derived chips (non-persistent response field)', async () => {
      const profile = mockProfile('v2-id', 'V2 User');
      getById.mockResolvedValue(profile);
      extractionGetByProfileId.mockResolvedValue(null);
      extractAll.mockResolvedValue(mockExtractionV2Result());

      const result = await controller.analyzeOneV2('v2-id');

      expect(result.ok).toBe(true);
      expect(result.profileId).toBe('v2-id');
      expect(result.extraction).toBeDefined();
      expect(result.chips).toEqual({
        attractionChips: ['hiking', 'travel', 'books', 'emotional depth', 'directness', 'lifestyle pace'],
        warningChips: ['smoking', 'dishonesty', 'social battery'],
        lifestyleChips: [],
      });
    });
  });
});
