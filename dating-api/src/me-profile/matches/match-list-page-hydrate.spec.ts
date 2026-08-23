import type { UserProfileStatus } from '@prisma/client';
import { hydrateMatchListPageFromRanks } from './match-list-page-hydrate';
import { toPresentationJson } from './match-list-rank-presentation.types';

const S_ANALYZED = 'ANALYZED' as UserProfileStatus;

function makeViewerContext(profileId: string, userId: string) {
  return {
    id: profileId,
    userId,
    name: 'Viewer',
    nickname: 'viewer',
    status: S_ANALYZED,
    birthDate: new Date('1990-01-01'),
    gender: 'MALE',
    desiredPartnerGenders: ['FEMALE'],
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv',
    aboutMe: 'a',
    aboutPartner: 'b',
    aboutRelationship: 'c',
    analyzedAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    datingChapter: null,
    preference: {
      id: `pref_${profileId}`,
      profileId,
      partnerAgeMin: null,
      partnerAgeMax: null,
      maxDistanceKm: null,
      acceptedPartnerGenders: ['FEMALE'],
      updatedAt: new Date('2026-04-01'),
    },
    signals: [],
    interests: [],
    childrenStatus: null,
    wantsChildren: null,
    smokingFrequency: null,
    alcoholUse: null,
    education: null,
    religion: null,
  };
}

function makeCandidateRow(id: string, userId: string) {
  return {
    id,
    userId,
    name: id,
    nickname: id,
    status: S_ANALYZED,
    birthDate: new Date('1992-01-01'),
    gender: 'FEMALE',
    desiredPartnerGenders: ['MALE'],
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv',
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    analyzedAt: new Date('2026-04-02'),
    updatedAt: new Date('2026-04-02'),
    datingChapter: null,
    preference: {
      id: `pref_${id}`,
      profileId: id,
      partnerAgeMin: null,
      partnerAgeMax: null,
      maxDistanceKm: null,
      acceptedPartnerGenders: ['MALE'],
      updatedAt: new Date('2026-04-02'),
    },
    signals: [],
    interests: [],
    photos: [{ id: `photo_${id}`, isPrimary: true, storageKey: null }],
    _count: { evaluations: 1 },
    childrenStatus: null,
    wantsChildren: null,
    smokingFrequency: null,
    alcoholUse: null,
    education: null,
    religion: null,
  };
}

function makeEval(profileId: string) {
  return {
    id: `eval_${profileId}`,
    profileId,
    version: 'v1',
    evaluationJson: {
      self: { signals: { ambition: 0.7 } },
      partner: { signals: {} },
      relationship: { signals: {} },
    },
    createdAt: new Date('2026-04-01'),
  };
}

describe('hydrateMatchListPageFromRanks', () => {
  const viewerUserId = 'user_v';
  const viewerProfileId = 'prof_v';
  const presentation = toPresentationJson({
    explainability: {
      positiveChips: ['Ambition alignment'],
      reasonShort: 'Strong alignment on ambition',
    },
    recommendation: {
      explainability: {
        positiveChips: ['Ambition alignment'],
        reasonShort: 'Strong alignment on ambition',
      },
      primaryTakeaway: 'Strong match',
      suggestedNextAction: 'Start a conversation',
    },
  });

  it('returns cacheMiss when any row lacks presentationJson', async () => {
    const result = await hydrateMatchListPageFromRanks(
      {
        matches: {
          findViewerMatchContextByUserId: jest.fn(),
          findCandidateProfilesByIdsForList: jest.fn(),
          findLatestEvaluationsForProfileIds: jest.fn(),
          findLatestEvaluationForProfile: jest.fn(),
          listActionsByActorForTargets: jest.fn(),
        },
        obs: { trace: jest.fn() },
      },
      viewerUserId,
      [
        {
          candidateProfileId: 'p1',
          matchScore: 90,
          hardBlocked: false,
          presentationJson: presentation,
        },
        {
          candidateProfileId: 'p2',
          matchScore: 80,
          hardBlocked: false,
          presentationJson: null,
        },
      ],
      {
        viewerProfileId,
        viewerDatingChapter: null,
        viewerAgeYears: 35,
      },
    );

    expect(result).toEqual({ cacheMiss: true });
  });

  it('hydrates list items from cached presentation without scoring', async () => {
    const candidate = makeCandidateRow('p1', 'u1');
    const evalRow = makeEval('p1');
    const matchesRepo = {
      findViewerMatchContextByUserId: jest
        .fn()
        .mockResolvedValue(makeViewerContext(viewerProfileId, viewerUserId)),
      findLatestEvaluationForProfile: jest.fn().mockResolvedValue(makeEval(viewerProfileId)),
      findCandidateProfilesByIdsForList: jest.fn().mockResolvedValue([candidate]),
      findLatestEvaluationsForProfileIds: jest
        .fn()
        .mockResolvedValue(new Map([[ 'p1', evalRow ]])),
      listActionsByActorForTargets: jest.fn().mockResolvedValue([]),
    };

    const result = await hydrateMatchListPageFromRanks(
      { matches: matchesRepo, obs: { trace: jest.fn() } },
      viewerUserId,
      [
        {
          candidateProfileId: 'p1',
          matchScore: 90,
          hardBlocked: false,
          presentationJson: presentation,
        },
      ],
      {
        viewerProfileId,
        viewerDatingChapter: null,
        viewerAgeYears: 35,
      },
    );

    expect(result.cacheMiss).toBe(false);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.id).toBe('p1');
    expect(result.matches[0]?.matchScore).toBe(90);
    expect(result.matches[0]?.priorityTier).toBe('HIGH');
    expect(result.matches[0]?.explainability?.positiveChips).toEqual([
      'Ambition alignment',
    ]);
    expect(result.matches[0]?.recommendation?.primaryTakeaway).toBe(
      'Strong match',
    );
  });
});
