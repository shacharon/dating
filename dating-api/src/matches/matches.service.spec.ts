import { MatchesService } from './matches.service';
import type { ProfileJsonPayload } from '../profiles/profiles-json.service';

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

describe('MatchesService.compare', () => {
  it('returns INSUFFICIENT_DATA and does not save when self signals are empty', async () => {
    const profilesJson = {
      getById: jest.fn(),
    };
    const matchesJson = {
      save: jest.fn(),
      list: jest.fn(),
      listFull: jest.fn(),
      getById: jest.fn(),
    };
    const service = new MatchesService(
      profilesJson as never,
      matchesJson as never,
    );

    profilesJson.getById
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
    expect(matchesJson.save).not.toHaveBeenCalled();
  });

  it('returns NOT_ANALYZED when evaluationStatus is not DONE', async () => {
    const profilesJson = { getById: jest.fn() };
    const matchesJson = {
      save: jest.fn(),
      list: jest.fn(),
      listFull: jest.fn(),
      getById: jest.fn(),
    };
    const service = new MatchesService(
      profilesJson as never,
      matchesJson as never,
    );

    profilesJson.getById
      .mockResolvedValueOnce(
        makeProfile('a', 'A', { ambition: 8 }, 'PENDING'),
      )
      .mockResolvedValueOnce(makeProfile('b', 'B', { ambition: 8 }));

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('NOT_ANALYZED');
    expect(matchesJson.save).not.toHaveBeenCalled();
  });

  it('returns READY and saves match when both profiles are analyzed', async () => {
    const profilesJson = {
      getById: jest.fn(),
    };
    const matchesJson = {
      save: jest.fn(),
      list: jest.fn(),
      listFull: jest.fn(),
      getById: jest.fn(),
    };
    const service = new MatchesService(
      profilesJson as never,
      matchesJson as never,
    );

    profilesJson.getById
      .mockResolvedValueOnce(makeProfile('a', 'A', { ambition: 8 }))
      .mockResolvedValueOnce(makeProfile('b', 'B', { ambition: 7 }));

    const result = await service.compare({ aId: 'a', bId: 'b' });

    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.match.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.match.compatibility).toBeDefined();
    }
    expect(matchesJson.save).toHaveBeenCalledTimes(1);
  });
});
