import { GenderIdentity } from '../../../../canonical/matching-canonical.types';
import { HgGateLegacyRankPolicy } from '../../../../matching-policy/hg-gate-legacy-rank.policy';
import { MatchEligibilityService } from '../../detail/match-eligibility.service';
import { emptyHolyGrailDimensionOutcomeCounts } from '../../../../holy-grail-matching/eligibility.evaluator';
import { emptyDealbreakerTagOutcomeCounts } from '../../../../holy-grail-matching/dealbreaker-telemetry';
import type { MeMatchesParticipantReadModel } from '../../../profile/me-profile-engine.mapper';
import { MatchListCandidateScorerService } from './match-list-candidate-scorer.service';
import type { MatchListRankingContext } from './match-list-ranking.types';

function baseContext(
  overrides: Partial<MatchListRankingContext> = {},
): MatchListRankingContext {
  const viewerRead: MeMatchesParticipantReadModel = {
    enginePayload: { version: 1 } as MeMatchesParticipantReadModel['enginePayload'],
    hg: {
      row: {},
      fallback: null,
    } as MeMatchesParticipantReadModel['hg'],
    evaluationDisplaySummary: null,
  };
  return {
    userId: 'user_v',
    emitListAnalytics: true,
    isPageHydrate: false,
    candidateCap: 50,
    asOf: new Date('2026-01-01T00:00:00.000Z'),
    viewer: { id: 'prof_v', datingChapter: null, userId: 'user_v' },
    viewerBridge: {
      selfGender: GenderIdentity.FEMALE,
      acceptedPartnerGenders: [GenderIdentity.MALE],
      derivedSelfAgeYears: 30,
      version: 1,
      selfBirthDate: null,
      location: { city: null, country: null, locationLabel: 'Tel Aviv' },
    },
    viewerEval: { createdAt: new Date('2025-01-01') },
    viewerRead,
    viewerProfileCore: {
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
    },
    candidateRows: [],
    totalBeforeFilter: 0,
    totalAnalyzedCandidates: 0,
    candidatesEligible: 0,
    filteredNoPhotoCandidates: 0,
    candidateLoadMs: 1,
    evalQueryMs: 1,
    latestEvalByProfile: new Map(),
    actionByTargetUserId: new Map(),
    mutualCounterpartUserIds: new Set(),
    ...overrides,
  };
}

describe('MatchListCandidateScorerService', () => {
  const obs = { trace: jest.fn() };
  const eligibility = {
    passesReciprocalGender: jest.fn().mockReturnValue(true),
    shouldAdmitHgHardFailOnList: jest.fn().mockReturnValue(false),
    isBlockedAction: jest.fn().mockReturnValue(false),
    buildHardBlockedDto: jest.fn(),
  };
  const pairMatchPolicy = new HgGateLegacyRankPolicy();
  const scorer = new MatchListCandidateScorerService(
    obs as never,
    eligibility as unknown as MatchEligibilityService,
    pairMatchPolicy,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty matches when candidateRows is empty', () => {
    const result = scorer.scoreCandidates(baseContext());
    expect(result.matches).toEqual([]);
    expect(result.pendingHardBlocks).toEqual([]);
    expect(result.budgetExceeded).toBe(false);
    expect(result.hgDimensionOutcomeCounts).toEqual(
      emptyHolyGrailDimensionOutcomeCounts(),
    );
    expect(result.dealbreakerOutcomeCounts).toEqual(
      emptyDealbreakerTagOutcomeCounts(),
    );
  });

  it('skips candidates that fail reciprocal gender', () => {
    eligibility.passesReciprocalGender.mockReturnValueOnce(false);
    const result = scorer.scoreCandidates(
      baseContext({
        candidateRows: [
          {
            id: 'prof_c',
            userId: 'user_c',
            nickname: 'C',
            photos: [],
            _count: { evaluations: 1 },
            updatedAt: new Date(),
            analyzedAt: new Date(),
            preference: null,
            signals: [],
            interests: [],
          },
        ],
        latestEvalByProfile: new Map([
          ['prof_c', { createdAt: new Date(), evaluationJson: {}, version: 1 }],
        ]),
      }),
    );
    expect(result.matches).toHaveLength(0);
    expect(eligibility.passesReciprocalGender).toHaveBeenCalled();
  });

  it('stops scoring when rebuild budget deadline is exceeded', () => {
    const result = scorer.scoreCandidates(
      baseContext({
        candidateRows: [
          { id: 'prof_1', userId: 'u1', photos: [], _count: { evaluations: 1 } },
          { id: 'prof_2', userId: 'u2', photos: [], _count: { evaluations: 1 } },
        ],
        latestEvalByProfile: new Map([
          ['prof_1', { createdAt: new Date(), evaluationJson: {}, version: 1 }],
          ['prof_2', { createdAt: new Date(), evaluationJson: {}, version: 1 }],
        ]),
      }),
      {
        deadlineAtMs: 0,
        now: () => 1,
      },
    );
    expect(result.budgetExceeded).toBe(true);
    expect(result.matches).toHaveLength(0);
  });
});
