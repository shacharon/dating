import { NotFoundException } from '@nestjs/common';
import { MatchFeedbackSentiment } from '@prisma/client';
import { buildMatchQualityAuditJson } from '../../me-profile/matches/actions/match-quality-audit';
import type { MeMatchesService } from '../../me-profile/matches/core/me-matches.service';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminMatchQualityService } from './admin-match-quality.service';
import { MatchQualityCandidateAuditService } from './match-quality-candidate-audit.service';
import { serializeMatchQualityExportCsv } from './match-quality-export-csv';
import { MatchQualityMetricsQueryService } from './match-quality-metrics-query.service';
import {
  computeCompareDeltas,
  computePositiveRate,
  computeWindowStart,
  resolveCompareWindows,
} from './match-quality-window';
import type { MatchQualityCompareQueryDto } from './dto/match-quality-compare-query.dto';

jest.mock('../../me-profile/matches/actions/match-quality-audit', () => ({
  buildMatchQualityAuditJson: jest.fn(),
}));

const buildAuditMock = buildMatchQualityAuditJson as jest.MockedFunction<
  typeof buildMatchQualityAuditJson
>;

describe('match-quality-window helpers', () => {
  it('computePositiveRate returns null when feedbackCount is 0', () => {
    expect(computePositiveRate(0, 0)).toBeNull();
  });

  it('computePositiveRate returns ratio when feedback exists', () => {
    expect(computePositiveRate(8, 5)).toBeCloseTo(0.625);
  });

  it('computeWindowStart subtracts windowDays from now', () => {
    const now = Date.now();
    const start = computeWindowStart(7);
    const diffMs = now - start.getTime();
    expect(diffMs).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 50);
    expect(diffMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 50);
  });

  it('resolveCompareWindows shorthand 7+7 yields disjoint bounds', () => {
    const windows = resolveCompareWindows({ beforeDays: 7, afterDays: 7 });
    expect(windows.before.end.getTime()).toBe(windows.after.start.getTime());
    expect(windows.before.start.getTime()).toBeLessThan(
      windows.before.end.getTime(),
    );
    expect(windows.after.start.getTime()).toBeLessThan(
      windows.after.end.getTime(),
    );
  });

  it('computeCompareDeltas returns positive rate delta after minus before', () => {
    const deltas = computeCompareDeltas(
      { positiveRate: 0.5, feedbackCount: 10 },
      { positiveRate: 0.6, feedbackCount: 12 },
    );
    expect(deltas.positiveRateDelta).toBeCloseTo(0.1);
    expect(deltas.feedbackCountDelta).toBe(2);
  });

  it('computeCompareDeltas returns null positiveRateDelta when either rate null', () => {
    expect(
      computeCompareDeltas(
        { positiveRate: null, feedbackCount: 0 },
        { positiveRate: 0.5, feedbackCount: 4 },
      ).positiveRateDelta,
    ).toBeNull();
  });

  it('resolveCompareWindows throws on overlapping ISO windows', () => {
    const query: MatchQualityCompareQueryDto = {
      beforeStart: '2026-05-20T00:00:00.000Z',
      beforeEnd: '2026-06-01T00:00:00.000Z',
      afterStart: '2026-05-27T00:00:00.000Z',
      afterEnd: '2026-06-10T00:00:00.000Z',
    };
    expect(() => resolveCompareWindows(query)).toThrow();
  });
});

describe('AdminMatchQualityService', () => {
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;

  const meMatches = {
    list: jest.fn(),
    getById: jest.fn(),
  } as unknown as MeMatchesService;

  const prisma = {
    userProfile: {
      findUnique: jest.fn(),
    },
    matchFeedback: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  let service: AdminMatchQualityService;

  beforeEach(() => {
    jest.clearAllMocks();
    const metricsQuery = new MatchQualityMetricsQueryService(prisma, obs);
    const candidateAudit = new MatchQualityCandidateAuditService(
      prisma,
      obs,
      meMatches,
    );
    service = new AdminMatchQualityService(metricsQuery, candidateAudit, obs);
  });

  it('getSummary returns zeros and null positiveRate when empty', async () => {
    prisma.matchFeedback.count = jest.fn().mockResolvedValue(0);
    prisma.matchFeedback.groupBy = jest.fn().mockResolvedValue([]);
    prisma.matchFeedback.findMany = jest.fn().mockResolvedValue([]);

    const res = await service.getSummary('admin_1', 7);

    expect(res.feedbackCount).toBe(0);
    expect(res.positiveRate).toBeNull();
  });

  it('getSummary computes positiveRate from grouped sentiments', async () => {
    prisma.matchFeedback.count = jest.fn().mockResolvedValue(8);
    prisma.matchFeedback.groupBy = jest.fn().mockResolvedValue([
      {
        sentiment: MatchFeedbackSentiment.POSITIVE,
        _count: { _all: 5 },
      },
      {
        sentiment: MatchFeedbackSentiment.NEGATIVE,
        _count: { _all: 3 },
      },
    ]);
    prisma.matchFeedback.findMany = jest
      .fn()
      .mockResolvedValueOnce([{ userId: 'u1' }])
      .mockResolvedValueOnce([{ matchProfileId: 'p1' }]);

    const res = await service.getSummary('admin_1', 7);

    expect(res.positiveRate).toBeCloseTo(0.625);
  });

  it('listNegativeCandidates maps raw SQL rows', async () => {
    const lastAt = new Date('2026-06-05T12:00:00.000Z');
    prisma.$queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        {
          matchProfileId: 'p2',
          negativeCount: 3,
          distinctViewers: 3,
          lastNegativeAt: lastAt,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = await service.listNegativeCandidates(7, 20, 0);

    expect(res.items[0].matchProfileId).toBe('p2');
  });

  it('getCandidateAudit builds feedbackSummary for window', async () => {
    prisma.userProfile.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'cand_1' });
    prisma.matchFeedback.groupBy = jest.fn().mockResolvedValue([
      {
        sentiment: MatchFeedbackSentiment.NEGATIVE,
        _count: { _all: 2 },
      },
      {
        sentiment: MatchFeedbackSentiment.POSITIVE,
        _count: { _all: 1 },
      },
    ]);
    prisma.matchFeedback.findFirst = jest.fn().mockResolvedValue({
      sentiment: MatchFeedbackSentiment.NEGATIVE,
    });
    prisma.matchFeedback.findMany = jest
      .fn()
      .mockResolvedValue([{ userId: 'viewer_1' }]);
    buildAuditMock.mockResolvedValue({
      schemaVersion: 1,
      generatedAt: '2026-06-01T00:00:00.000Z',
      env: { engineInputSource: 'evaluationJson' },
      viewer: { userId: 'viewer_1', profileId: 'vp1' },
      candidate: { profileId: 'cand_1' },
      engineInputSource: {
        viewer: 'evaluationJson',
        candidate: 'evaluationJson',
      },
      compare: { outcome: 'scored' },
      matchScore: 72,
      explainability: { positiveChips: ['Chip'], reasonShort: 'Ok' },
      recommendation: null,
      evaluationSummary: 'Summary',
    });

    const res = await service.getCandidateAudit(
      'admin_1',
      'cand_1',
      7,
      'viewer_1',
    );

    expect(res.feedbackSummary).toEqual({
      negativeCount: 2,
      positiveCount: 1,
      lastSentiment: MatchFeedbackSentiment.NEGATIVE,
    });
    expect(res.audit?.matchScore).toBe(72);
    expect(buildAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        viewerUserId: 'viewer_1',
        candidateProfileId: 'cand_1',
        includeListContext: true,
      }),
    );
  });

  it('getCandidateAudit tries second viewer when first throws NotFoundException', async () => {
    prisma.userProfile.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'cand_1' });
    prisma.matchFeedback.groupBy = jest.fn().mockResolvedValue([]);
    prisma.matchFeedback.findFirst = jest.fn().mockResolvedValue(null);
    prisma.matchFeedback.findMany = jest
      .fn()
      .mockResolvedValue([{ userId: 'v1' }, { userId: 'v2' }]);
    buildAuditMock
      .mockRejectedValueOnce(new NotFoundException())
      .mockResolvedValueOnce({
        schemaVersion: 1,
        generatedAt: '2026-06-01T00:00:00.000Z',
        env: { engineInputSource: 'evaluationJson' },
        viewer: { userId: 'v2', profileId: 'vp2' },
        candidate: { profileId: 'cand_1' },
        engineInputSource: {
          viewer: 'evaluationJson',
          candidate: 'evaluationJson',
        },
        compare: { outcome: 'guard' },
        matchScore: null,
        explainability: null,
        recommendation: null,
        evaluationSummary: 'Summary',
      });

    const res = await service.getCandidateAudit('admin_1', 'cand_1', 7);

    expect(res.viewerUserId).toBe('v2');
    expect(res.audit?.compare.outcome).toBe('guard');
    expect(buildAuditMock).toHaveBeenCalledTimes(2);
  });

  it('getCandidateAudit returns auditUnavailable when all viewers fail', async () => {
    prisma.userProfile.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'cand_1' });
    prisma.matchFeedback.groupBy = jest.fn().mockResolvedValue([]);
    prisma.matchFeedback.findFirst = jest.fn().mockResolvedValue(null);
    prisma.matchFeedback.findMany = jest
      .fn()
      .mockResolvedValue([{ userId: 'v1' }]);
    buildAuditMock.mockRejectedValue(new NotFoundException());

    const res = await service.getCandidateAudit('admin_1', 'cand_1', 7);

    expect(res.audit).toBeNull();
    expect(res.auditUnavailable?.code).toBe('match_not_visible_to_viewer');
    expect(res.viewerUserId).toBe('v1');
  });

  it('getCandidateAudit throws when candidate profile missing', async () => {
    prisma.userProfile.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.getCandidateAudit('admin_1', 'missing', 7, 'viewer_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exportMatchQuality composes summary and top 20 negatives as JSON', async () => {
    jest.spyOn(service, 'getSummary').mockResolvedValue({
      windowDays: 7,
      windowStart: '2026-06-03T00:00:00.000Z',
      feedbackCount: 12,
      positiveCount: 8,
      negativeCount: 4,
      positiveRate: 8 / 12,
      distinctReporters: 10,
      distinctCandidates: 9,
    });
    jest.spyOn(service, 'listNegativeCandidates').mockResolvedValue({
      windowDays: 7,
      items: [
        {
          matchProfileId: 'p_neg',
          negativeCount: 3,
          distinctViewers: 3,
          lastNegativeAt: '2026-06-09T10:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });

    const result = await service.exportMatchQuality('admin_1', 7, 'json');

    expect(service.listNegativeCandidates).toHaveBeenCalledWith(7, 20, 0);
    expect(result).toMatchObject({
      windowDays: 7,
      summary: {
        feedbackCount: 12,
        positiveRate: expect.closeTo(8 / 12),
      },
      negativeCandidates: [
        expect.objectContaining({ matchProfileId: 'p_neg', negativeCount: 3 }),
      ],
      notes: { adoptionRate: null, adoptionSource: 'logs_only' },
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('admin_match_quality_export_fetched'),
      'ADMIN_MATCH_QUALITY_EXPORT_FETCHED',
    );
  });

  it('exportMatchQuality returns CSV string when format is csv', async () => {
    jest.spyOn(service, 'getSummary').mockResolvedValue({
      windowDays: 7,
      windowStart: '2026-06-03T00:00:00.000Z',
      feedbackCount: 8,
      positiveCount: 5,
      negativeCount: 3,
      positiveRate: 0.625,
      distinctReporters: 6,
      distinctCandidates: 5,
    });
    jest.spyOn(service, 'listNegativeCandidates').mockResolvedValue({
      windowDays: 7,
      items: [
        {
          matchProfileId: 'p2',
          negativeCount: 2,
          distinctViewers: 2,
          lastNegativeAt: '2026-06-08T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });

    const csv = await service.exportMatchQuality('admin_1', 7, 'csv');

    expect(typeof csv).toBe('string');
    expect(csv).toContain('# positiveRate,0.625');
    expect(csv).toContain(
      'matchProfileId,negativeCount,distinctViewers,lastNegativeAt',
    );
    expect(csv).toContain('p2,2,2,2026-06-08T00:00:00.000Z');
  });

  it('compareMatchQuality returns before, after, and deltas', async () => {
    const beforeStart = new Date('2026-05-20T00:00:00.000Z');
    const beforeEnd = new Date('2026-05-27T00:00:00.000Z');
    const afterStart = new Date('2026-05-27T00:00:00.000Z');
    const afterEnd = new Date('2026-06-03T00:00:00.000Z');

    prisma.matchFeedback.count = jest.fn().mockResolvedValue(10);
    prisma.matchFeedback.groupBy = jest.fn().mockImplementation(({ where }) => {
      const gte = where.createdAt.gte.toISOString();
      if (gte === beforeStart.toISOString()) {
        return Promise.resolve([
          {
            sentiment: MatchFeedbackSentiment.POSITIVE,
            _count: { _all: 8 },
          },
          {
            sentiment: MatchFeedbackSentiment.NEGATIVE,
            _count: { _all: 2 },
          },
        ]);
      }
      return Promise.resolve([
        {
          sentiment: MatchFeedbackSentiment.POSITIVE,
          _count: { _all: 5 },
        },
        {
          sentiment: MatchFeedbackSentiment.NEGATIVE,
          _count: { _all: 5 },
        },
      ]);
    });
    prisma.matchFeedback.findMany = jest.fn().mockResolvedValue([]);

    const result = await service.compareMatchQuality('admin_1', {
      before: { start: beforeStart, end: beforeEnd },
      after: { start: afterStart, end: afterEnd },
    });

    expect(result.before.positiveRate).toBe(0.8);
    expect(result.after.positiveRate).toBe(0.5);
    expect(result.deltas.positiveRateDelta).toBeCloseTo(-0.3);
    expect(result.deltas.feedbackCountDelta).toBe(0);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('admin_match_quality_compare_fetched'),
      'ADMIN_MATCH_QUALITY_COMPARE_FETCHED',
    );
  });
});

describe('serializeMatchQualityExportCsv', () => {
  it('renders empty positiveRate when feedback count is zero', () => {
    const csv = serializeMatchQualityExportCsv({
      exportedAt: '2026-06-10T00:00:00.000Z',
      windowDays: 7,
      windowStart: '2026-06-03T00:00:00.000Z',
      summary: {
        feedbackCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        positiveRate: null,
        distinctReporters: 0,
        distinctCandidates: 0,
      },
      negativeCandidates: [],
      notes: {
        adoptionRate: null,
        adoptionSource: 'logs_only',
        drillDownHypotheses: 'manual',
      },
    });

    expect(csv).toContain('# positiveRate,');
    expect(csv).toContain(
      'matchProfileId,negativeCount,distinctViewers,lastNegativeAt',
    );
  });
});

