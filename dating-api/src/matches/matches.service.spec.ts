import { MatchesService } from './matches.service';
import type { ProfileJsonPayload } from '../profiles/profiles-json.service';

function makeProfile(
  id: string,
  name: string,
  selfSignals: Record<string, number | null>,
): ProfileJsonPayload {
  return {
    id,
    name,
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
  it('returns NOT_ANALYZED and does not save match when either profile is unanalyzed', async () => {
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

    expect(result.status).toBe('NOT_ANALYZED');
    if (result.status === 'NOT_ANALYZED') {
      expect(result.match.message).toBe(
        'Run analyze for both profiles before compare',
      );
      expect(result.match.compatibility).toBeNull();
      expect(result.match.overall).toBeNull();
      expect(result.match.finalScore).toBeNull();
    }
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
