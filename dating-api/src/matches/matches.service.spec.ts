import { MatchesService } from './matches.service';
import type { ProfileJsonPayload } from '../profiles/profiles.types';

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

const canonicalV2Row = {
  relationship_clarity_self: 5,
  relationship_clarity_partner: 5,
  relationship_clarity_relationship: 5,
};

function makePrismaMock() {
  return {
    profileExtractionV2: {
      findUnique: jest.fn().mockResolvedValue(canonicalV2Row),
    },
  };
}

describe('MatchesService.compare', () => {
  it('returns INSUFFICIENT_DATA when self signals are empty on one side', async () => {
    const profilesPrisma = { getById: jest.fn() };
    const prisma = makePrismaMock();
    const service = new MatchesService(
      profilesPrisma as never,
      prisma as never,
    );

    profilesPrisma.getById
      .mockResolvedValueOnce(makeProfile('a', 'A', {}))
      .mockResolvedValueOnce(makeProfile('b', 'B', { ambition: 8 }));

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('INSUFFICIENT_DATA');
    if (result.status === 'INSUFFICIENT_DATA') {
      expect(result.match.message).toContain('empty or non-numeric');
      expect(result.match.compatibility).toBeNull();
      expect(result.match.overall).toBeNull();
      expect(result.match.finalScore).toBeNull();
    }
    expect(prisma.profileExtractionV2.findUnique).toHaveBeenCalled();
  });

  it('returns NOT_ANALYZED when evaluationStatus is not DONE', async () => {
    const profilesPrisma = { getById: jest.fn() };
    const prisma = makePrismaMock();
    const service = new MatchesService(
      profilesPrisma as never,
      prisma as never,
    );

    profilesPrisma.getById
      .mockResolvedValueOnce(
        makeProfile('a', 'A', { ambition: 8 }, 'FAILED'),
      )
      .mockResolvedValueOnce(makeProfile('b', 'B', { ambition: 8 }));

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('NOT_ANALYZED');
  });

  it('returns READY when both profiles are analyzed and V2 rows exist', async () => {
    const profilesPrisma = { getById: jest.fn() };
    const prisma = makePrismaMock();
    const service = new MatchesService(
      profilesPrisma as never,
      prisma as never,
    );

    profilesPrisma.getById
      .mockResolvedValueOnce(makeProfile('a', 'A', { ambition: 8 }))
      .mockResolvedValueOnce(makeProfile('b', 'B', { ambition: 7 }));

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.match.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.match.compatibility).toBeDefined();
    }
  });
});
