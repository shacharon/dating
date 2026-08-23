import type { ProfileJsonPayload } from '../../../profiles/profiles.types';
import {
  rebaseMeMatchListItemScore,
  toMeMatchDetail,
  toMeMatchListItem,
  toMeMatchesListNotReady,
  toMeMatchesListReady,
} from './me-matches-response.mapper';

const emptyPayload = {
  self: { signals: {} },
  partner: { signals: {} },
  relationship: { signals: {} },
} as unknown as ProfileJsonPayload;

describe('me-matches-response.mapper', () => {
  const teaser = {
    datingChapter: 'first_chapter' as const,
    viewerAgeYears: 30,
    viewerPayload: emptyPayload,
    candidatePayload: emptyPayload,
  };

  it('toMeMatchesListNotReady includes pagination envelope', () => {
    expect(toMeMatchesListNotReady('no_photo')).toEqual({
      status: 'not_ready',
      reason: 'no_photo',
      nextCursor: null,
      hasMore: false,
    });
  });

  it('toMeMatchListItem omits detail-only fields and trims nickname', () => {
    const item = toMeMatchListItem({
      id: 'p1',
      nickname: '  River  ',
      gender: 'FEMALE',
      ageYears: 28,
      locationLabel: 'TLV',
      analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
      hasEvaluation: true,
      profileAnalysisStale: false,
      primaryPhotoUrl: '/photo',
      approvedPhotoCount: 1,
      yourAction: null,
      score: {
        matchScore: 80,
        explainability: { positiveChips: ['a'], reasonShort: 'ok' },
        recommendation: {
          explainability: { positiveChips: ['a'], reasonShort: 'ok' },
          primaryTakeaway: 't',
          suggestedNextAction: 'n',
        },
      },
      teaser,
    });

    expect(item.nickname).toBe('River');
    expect(item.priorityTier).toBe('GOOD');
    expect(item.priorityScore).toBe(80);
    expect(item.teaser).toEqual(
      expect.objectContaining({ showScore: expect.any(Boolean) }),
    );
    expect(item).not.toHaveProperty('evaluationSummary');
    expect(item).not.toHaveProperty('matchExplanationTraits');
    expect(item).not.toHaveProperty('matchNarrative');
    expect(item).not.toHaveProperty('userId');
  });

  it('toMeMatchDetail includes summary and omits yourAction/userId', () => {
    const detail = toMeMatchDetail({
      id: 'p1',
      nickname: null,
      gender: 'MALE',
      ageYears: 40,
      locationLabel: null,
      analyzedAt: null,
      hasEvaluation: true,
      evaluationSummary: 'Warm.',
      primaryPhotoUrl: null,
      approvedPhotoCount: 0,
      matchExplanationTraits: [
        {
          group: 'g',
          label: 'l',
          evidence: 'e',
          strength: 'moderate',
        },
      ],
      matchNarrative: 'Why you match.',
      score: {
        matchScore: 50,
        explainability: null,
        recommendation: null,
      },
      teaser,
    });

    expect(detail.evaluationSummary).toBe('Warm.');
    expect(detail.matchNarrative).toBe('Why you match.');
    expect(detail.matchExplanationTraits).toHaveLength(1);
    expect(detail).not.toHaveProperty('yourAction');
    expect(detail).not.toHaveProperty('userId');
  });

  it('toMeMatchesListReady sets optional counters only when provided', () => {
    const ready = toMeMatchesListReady({
      viewerProfileId: 'v',
      viewerGender: 'MALE',
      viewerAcceptedPartnerGenders: ['FEMALE'],
      viewerProfileAnalysisStale: false,
      matches: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(ready.status).toBe('ready');
    expect(ready).not.toHaveProperty('totalCandidatesBeforeFilter');
    expect(ready).not.toHaveProperty('budgetExceeded');
  });

  it('rebaseMeMatchListItemScore refreshes priority from rank score', () => {
    const base = toMeMatchListItem({
      id: 'p1',
      nickname: 'x',
      gender: 'FEMALE',
      ageYears: 30,
      locationLabel: 'TLV',
      analyzedAt: null,
      hasEvaluation: true,
      primaryPhotoUrl: null,
      approvedPhotoCount: 1,
      yourAction: null,
      score: {
        matchScore: 50,
        explainability: null,
        recommendation: null,
      },
      teaser,
    });
    const rebased = rebaseMeMatchListItemScore(base, 90, {
      datingChapter: 'first_chapter',
      ageYears: 30,
    });
    expect(rebased.matchScore).toBe(90);
    expect(rebased.priorityTier).toBe('HIGH');
    expect(rebased.teaser.score).toBe(90);
  });
});
