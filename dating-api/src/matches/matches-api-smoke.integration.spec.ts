/**
 * Minimal matches API smoke: in-process HTTP (supertest) against {@link MatchesController}
 * with mocked persistence. Run: `npm run smoke:matches`
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchDaemonService } from './match-daemon.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenUnsureAnalyticsService } from './children-unsure-analytics.service';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';
import { HG_LIST_PRODUCT_POLICY_VERSION } from './children-unsure.product-policy';
import type { MatchListItemDto, MatchRecordDto } from './match.types';
import { MATCH_RANKING_CONTRACT } from './match-ranking-contract';

function hasOwn(o: unknown, k: string): boolean {
  return o != null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
}

const minimalRecord: MatchRecordDto = {
  matchId: 'a__b',
  aId: 'a',
  bId: 'b',
  a: { id: 'a', name: 'Alex' },
  b: { id: 'b', name: 'Blake' },
  overall: 80,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
  aToB: 80,
  bToA: 80,
  relationshipStyle: 0,
  coverage: 0,
  frictionRisk: 0,
  finalScore: 80,
  alignments: [],
  tensions: [],
};

const listItemBase: MatchListItemDto = {
  matchId: 'a__b',
  a: { id: 'a', name: 'Alex' },
  b: { id: 'b', name: 'Blake' },
  overall: 80,
  finalScore: 80,
  updatedAt: '2020-01-01T00:00:00.000Z',
  dealbreakers: [],
  shortReason: 'Good fit',
  engineFinalScore: 80,
  rankingScore: 80,
  children_unsure: { profile_a_to_profile_b: false, profile_b_to_profile_a: false },
};

describe('matches API smoke (integration)', () => {
  let app: INestApplication<App>;

  const matchesServiceMock = {
    list: jest.fn(),
    getReadyMatchDetailContext: jest.fn(),
    compare: jest.fn(),
    getShadowHgVsLegacyMetrics: jest.fn(),
    isHgListAdmissionGateEnabled: jest.fn().mockReturnValue(false),
    isHgCompareDiagnosticEnabled: jest.fn().mockReturnValue(false),
    compareHgDiagnostic: jest.fn(),
  };

  const prismaMock = {
    matchPairHgSnapshot: {
      findUnique: jest.fn(),
    },
  };

  const analyticsMock = {
    recordListOrTopResponse: jest.fn(),
    getDailySummary: jest.fn().mockReturnValue({
      dateUtc: '2020-01-01',
      listAndTopRequests: 0,
      matchesWithChildrenUnsureCount: 0,
      totalMatchesReturned: 0,
      hideChildrenUnsureFilterInvocations: 0,
      badgeImpressionEvents: 0,
      badgeClickEvents: 0,
    }),
    recordBadgeImpression: jest.fn(),
    recordBadgeClick: jest.fn(),
  };

  const telemetryMock = {
    beginListBatch: jest.fn(),
    recordListPair: jest.fn(),
    endListBatch: jest.fn(),
    recordDetailResolution: jest.fn(),
    getCumulative: jest.fn().mockReturnValue({}),
    getLastListBatch: jest.fn().mockReturnValue({}),
  };

  beforeAll(async () => {
    delete process.env.ENABLE_HG_LIST_ADMISSION_GATE;

    const itemWithHg: MatchListItemDto = {
      ...listItemBase,
      hgMutualPass: true,
      hgOverallStatus: 'PASS:PASS',
      hgRankScore: 0,
    };
    const itemNoHg: MatchListItemDto = {
      ...listItemBase,
      matchId: 'x__y',
      a: { id: 'x', name: 'X' },
      b: { id: 'y', name: 'Y' },
    };

    matchesServiceMock.list.mockImplementation(async () => [itemWithHg, itemNoHg]);
    matchesServiceMock.compare.mockResolvedValue({
      status: 'READY',
      matchId: 'a__b',
      match: minimalRecord,
    });
    matchesServiceMock.getShadowHgVsLegacyMetrics.mockResolvedValue({
      contract: MATCH_RANKING_CONTRACT,
      generatedAtUtc: new Date().toISOString(),
      listItemCount: 2,
      admission: {
        legacyListSurfaceCount: 2,
        hgWireCompleteCount: 1,
        hgWireIncompleteCount: 1,
        keptUnderShadowMutualPassGate: 1,
        droppedUnderShadowMutualPassGate: 0,
      },
      ranking: {
        shadowSortDescription: 'test',
        inversionCountAmongHgCompleteVsLegacyOrder: 0,
        inversionDenominatorAmongHgComplete: 0,
        reorderedUnderShadowHgRankAmongHgComplete: 0,
      },
      kidsFamily: { byCase: { NONE: 2 } as Record<string, number>, sampleMatchIdsByCase: {} },
    });

    prismaMock.matchPairHgSnapshot.findUnique.mockResolvedValue({
      matchId: 'a__b',
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgChildrenStatus: 'PASS:PASS',
      hgOverallStatus: 'PASS:PASS',
      hgSoftPassCount: 0,
      childrenUnsure: false,
      hgRankPenaltyApplied: false,
    });

    matchesServiceMock.getReadyMatchDetailContext.mockResolvedValue({
      match: minimalRecord,
      rowA: {} as never,
      rowB: {} as never,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        { provide: MatchesService, useValue: matchesServiceMock },
        {
          provide: MatchDaemonService,
          useValue: { runOnce: jest.fn(), getAutoIndex: jest.fn().mockResolvedValue(null) },
        },
        { provide: PrismaService, useValue: prismaMock },
        { provide: ChildrenUnsureAnalyticsService, useValue: analyticsMock },
        { provide: HolyGrailPairSnapshotTelemetryService, useValue: telemetryMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('checklist: list JSON shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/matches').expect(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const it = res.body.items[0];
    for (const k of ['matchId', 'a', 'b', 'overall', 'updatedAt', 'dealbreakers', 'shortReason']) {
      expect(hasOwn(it, k)).toBe(true);
    }
  });

  it('checklist: top previews', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/matches/top').expect(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.matches)).toBe(true);
    if (res.body.matches.length > 0) {
      const m = res.body.matches[0];
      expect(hasOwn(m, 'id')).toBe(true);
      expect(hasOwn(m, 'name')).toBe(true);
      expect(hasOwn(m, 'compatibilityScore')).toBe(true);
    }
  });

  it('checklist: detail 404', async () => {
    matchesServiceMock.getReadyMatchDetailContext.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/api/v1/matches/__bad__').expect(404);
    matchesServiceMock.getReadyMatchDetailContext.mockResolvedValue({
      match: minimalRecord,
      rowA: {} as never,
      rowB: {} as never,
    });
  });

  it('checklist: detail 200 + HG triple all-or-none', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/matches/a__b').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBe('a__b');
    expect(typeof res.body.score).toBe('number');
    expect(hasOwn(res.body, 'children_unsure')).toBe(true);
    const hasM = hasOwn(res.body, 'hgMutualPass');
    const hasO = hasOwn(res.body, 'hgOverallStatus');
    const hasR = hasOwn(res.body, 'hgRankScore');
    expect(hasM === hasO && hasM === hasR).toBe(true);
  });

  it('checklist: compare READY', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/matches/compare')
      .send({ aId: 'a', bId: 'b' })
      .expect(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('READY');
    expect(res.body.match?.matchId).toBe('a__b');
  });

  it('checklist: compare guard (INSUFFICIENT_DATA)', async () => {
    matchesServiceMock.compare.mockResolvedValueOnce({
      status: 'INSUFFICIENT_DATA',
      matchId: 'a__b',
      match: {
        matchId: 'a__b',
        aId: 'a',
        bId: 'b',
        a: { id: 'a', name: 'Alex' },
        b: { id: 'b', name: 'Blake' },
        status: 'INSUFFICIENT_DATA',
        message: 'sparse',
        compatibility: null,
        partnerFit: null,
        relationshipFit: null,
        coverage: null,
        friction: null,
        overall: null,
        finalScore: null,
      },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/matches/compare')
      .send({ aId: 'a', bId: 'b' })
      .expect(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('INSUFFICIENT_DATA');
    expect(typeof res.body.message).toBe('string');
    matchesServiceMock.compare.mockResolvedValue({
      status: 'READY',
      matchId: 'a__b',
      match: minimalRecord,
    });
  });

  it('checklist: HG optional fields presence/absence on list', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/matches').expect(200);
    for (const it of res.body.items as unknown[]) {
      const hasM = hasOwn(it, 'hgMutualPass');
      const hasO = hasOwn(it, 'hgOverallStatus');
      const hasR = hasOwn(it, 'hgRankScore');
      expect(hasM === hasO && hasM === hasR).toBe(true);
    }
    const withHg = (res.body.items as MatchListItemDto[]).find((i) => i.matchId === 'a__b');
    const noHg = (res.body.items as MatchListItemDto[]).find((i) => i.matchId === 'x__y');
    expect(withHg && hasOwn(withHg, 'hgMutualPass')).toBe(true);
    expect(noHg && !hasOwn(noHg, 'hgMutualPass')).toBe(true);
  });

  it('checklist: gate-off default (env unset + service gate false)', async () => {
    expect(process.env.ENABLE_HG_LIST_ADMISSION_GATE).toBeUndefined();
    expect(matchesServiceMock.isHgListAdmissionGateEnabled()).toBe(false);
    await request(app.getHttpServer()).get('/api/v1/matches').expect(200);
  });
});
