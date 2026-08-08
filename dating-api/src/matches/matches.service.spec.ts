import { NotFoundException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';
import * as HolyGrailPairDirections from './holy-grail-pair-directions';
import { AdminPairMatchEvaluator } from './admin-pair-match.evaluator';
import { HgGateLegacyRankPolicy } from '../matching-policy/hg-gate-legacy-rank.policy';

function makeProfile(
  id: string,
  name: string,
  selfSignals: Record<string, number | null>,
  evaluationStatus?: ProfileJsonPayload['evaluationStatus'],
): ProfileJsonPayload {
  return {
    id,
    name,
    evaluationStatus,
    texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
    evaluation: {
      self: {
        domain: 'self',
        signals: selfSignals,
        evidence: [],
        version: 'v1',
        confidence: 0.5,
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
        selfVsPartner: { overallScore: 0 },
        selfVsRelationship: { overallScore: 0 },
      },
      display: { summary: '', insight: '' },
      productScores: {
        partnerFitScore: 50,
        relationshipFitScore: 50,
        coverageScore: 50,
        frictionRiskScore: 0,
        overallDecisionScore: 50,
        policyVersion: 'product-score-v1',
      },
      flags: [],
    } as ProfileJsonPayload['evaluation'],
    savedAt: new Date().toISOString(),
  };
}

function makePrismaMock() {
  return {};
}

function makeHgPairSnapshotTelemetryMock() {
  return {
    beginListBatch: jest.fn(),
    recordListPair: jest.fn(),
    endListBatch: jest.fn(),
    recordDetailResolution: jest.fn(),
    getCumulative: jest.fn(),
    getLastListBatch: jest.fn(),
  };
}

function makeConfigMock() {
  return { get: jest.fn().mockReturnValue(undefined) };
}

function makeAdminPairMatchEvaluator() {
  return new AdminPairMatchEvaluator(new HgGateLegacyRankPolicy());
}

function stubHgRow(id: string): ChildrenUnsureProfileRow {
  return {
    id,
    holyGrailStructuredFacts: {},
    holyGrailStructuredPreferences: {},
    extractionV2: { interests_self: [], interests: [], lifestyleTraits: [] },
  };
}

function makeRuntimeBundle(a: ProfileJsonPayload, b: ProfileJsonPayload) {
  return {
    profileA: a,
    profileB: b,
    rowA: stubHgRow(a.id),
    rowB: stubHgRow(b.id),
  };
}

function createMatchesService(
  profilesPrisma: { loadMatchPairRuntimeBundle: jest.Mock },
  prisma: object = makePrismaMock(),
) {
  return new MatchesService(
    profilesPrisma as never,
    prisma as never,
    makeHgPairSnapshotTelemetryMock() as never,
    makeConfigMock() as never,
    makeAdminPairMatchEvaluator(),
  );
}

describe('MatchesService.compare', () => {
  it('returns INSUFFICIENT_DATA when self signals are empty on one side and HG directions unavailable', async () => {
    const hgSpy = jest.spyOn(HolyGrailPairDirections, 'evaluateHolyGrailPairDirections').mockReturnValue(null);
    const profilesPrisma = { loadMatchPairRuntimeBundle: jest.fn() };
    const service = createMatchesService(profilesPrisma);

    profilesPrisma.loadMatchPairRuntimeBundle.mockResolvedValue(
      makeRuntimeBundle(makeProfile('a', 'A', {}), makeProfile('b', 'B', { ambition: 8 })),
    );

    const result = await service.compare({ aId: 'a', bId: 'b' });
    hgSpy.mockRestore();

    expect(result.status).toBe('INSUFFICIENT_DATA');
    if (result.status === 'INSUFFICIENT_DATA') {
      expect(result.match.message).toContain('empty or non-numeric');
      expect(result.match.compatibility).toBeNull();
      expect(result.match.finalScore).toBeNull();
      expect(result.match.finalScore).toBeNull();
    }
  });

  it('returns NOT_ANALYZED when evaluationStatus is not DONE', async () => {
    const profilesPrisma = { loadMatchPairRuntimeBundle: jest.fn() };
    const service = createMatchesService(profilesPrisma);

    profilesPrisma.loadMatchPairRuntimeBundle.mockResolvedValue(
      makeRuntimeBundle(
        makeProfile('a', 'A', { ambition: 8 }, 'FAILED'),
        makeProfile('b', 'B', { ambition: 8 }),
      ),
    );

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('NOT_ANALYZED');
  });

  it('returns READY when both profiles are analyzed and V2 rows exist', async () => {
    const profilesPrisma = { loadMatchPairRuntimeBundle: jest.fn() };
    const service = createMatchesService(profilesPrisma);

    profilesPrisma.loadMatchPairRuntimeBundle.mockResolvedValue(
      makeRuntimeBundle(makeProfile('a', 'A', { ambition: 8 }), makeProfile('b', 'B', { ambition: 7 })),
    );

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.match.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.match.compatibility).toBeDefined();
    }
  });
});

describe('MatchesService.compareHgDiagnostic', () => {
  it('throws NotFound when one profile id is missing', async () => {
    const profilesPrisma = {
      loadMatchPairRuntimeBundle: jest.fn().mockResolvedValue(null),
    };
    const service = createMatchesService(profilesPrisma, {});

    await expect(service.compareHgDiagnostic({ aId: 'a', bId: 'b' })).rejects.toThrow(NotFoundException);
  });
});
