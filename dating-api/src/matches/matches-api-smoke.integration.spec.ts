/**
 * Minimal matches API smoke: in-process HTTP (supertest) against {@link MatchesController}
 * with mocked persistence. Run: `npm run smoke:matches`
 *
 * Note: `GET /api/v1/matches` (list) was removed; engine list is `GET /api/matches` (MatchesApiController).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchDaemonService } from './match-daemon.service';
import { PrismaService } from '../prisma/prisma.service';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';
import type { MatchRecordDto } from './match.types';

function hasOwn(o: unknown, k: string): boolean {
  return o != null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
}

const minimalRecord: MatchRecordDto = {
  matchId: 'a__b',
  aId: 'a',
  bId: 'b',
  a: { id: 'a', name: 'Alex' },
  b: { id: 'b', name: 'Blake' },
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

describe('matches API smoke (integration)', () => {
  let app: INestApplication<App>;

  const matchesServiceMock = {
    getReadyMatchDetailContext: jest.fn(),
    compare: jest.fn(),
  };

  const prismaMock = {} as unknown as PrismaService;

  const telemetryMock = {
    beginListBatch: jest.fn(),
    recordListPair: jest.fn(),
    endListBatch: jest.fn(),
    recordDetailResolution: jest.fn(),
  };

  beforeAll(async () => {
    delete process.env.ENABLE_HG_LIST_ADMISSION_GATE;

    matchesServiceMock.compare.mockResolvedValue({
      status: 'READY',
      matchId: 'a__b',
      match: minimalRecord,
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
        { provide: HolyGrailPairSnapshotTelemetryService, useValue: telemetryMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('checklist: legacy list route removed (404)', async () => {
    await request(app.getHttpServer()).get('/api/v1/matches').expect(404);
  });

  it('checklist: /top tombstone returns 404 (not proxied to :id)', async () => {
    await request(app.getHttpServer()).get('/api/v1/matches/top').expect(404);
    expect(matchesServiceMock.getReadyMatchDetailContext).not.toHaveBeenCalledWith('top');
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
});
