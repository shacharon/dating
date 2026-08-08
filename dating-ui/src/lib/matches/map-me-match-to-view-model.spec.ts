import { describe, expect, it } from 'vitest';
import type {
  MeMatchDetailDto,
  MeMatchItemDto,
  MeMatchesListDto,
} from '@/lib/me-matches-api';
import {
  groupMatchesByPriorityVm,
  mapMeMatchDetailToViewModel,
  mapMeMatchItemToViewModel,
  mapMeMatchesListToViewModel,
  resolveMatchTier,
} from './map-me-match-to-view-model';

function baseItem(
  overrides: Partial<MeMatchItemDto> = {},
): MeMatchItemDto {
  return {
    id: 'p1',
    nickname: 'Alex',
    gender: 'female',
    ageYears: 30,
    locationLabel: 'Berlin',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    hasEvaluation: true,
    matchScore: 90,
    priorityScore: 90,
    priorityTier: 'HIGH',
    explainability: null,
    recommendation: null,
    ...overrides,
  };
}

describe('resolveMatchTier', () => {
  it('uses wire tier when valid', () => {
    expect(resolveMatchTier({ priorityTier: 'GOOD', score: 99 })).toBe('GOOD');
  });

  it('derives from score thresholds', () => {
    expect(resolveMatchTier({ score: 85 })).toBe('HIGH');
    expect(resolveMatchTier({ score: 70 })).toBe('GOOD');
    expect(resolveMatchTier({ score: 69 })).toBe('OTHER');
    expect(resolveMatchTier({ score: null })).toBe('OTHER');
  });
});

describe('mapMeMatchItemToViewModel', () => {
  it('maps score, tier, viewerAction, and why', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({
        matchScore: 72,
        priorityTier: undefined,
        yourAction: 'LIKE',
        explainability: {
          positiveChips: ['Ambition alignment'],
          tensionChip: 'Pace',
          reasonShort: 'Shared drive',
          sharedInterestNote: 'Both like hiking',
          interestOverlapTags: ['hiking'],
        },
        recommendation: {
          explainability: {
            positiveChips: [],
            reasonShort: 'ignored nested',
          },
          primaryTakeaway: 'Strong fit',
          caution: 'Talk early',
          suggestedNextAction: 'Message',
        },
      }),
    );

    expect(vm.score).toBe(72);
    expect(vm.tier).toBe('GOOD');
    expect(vm.viewerAction).toBe('LIKE');
    expect(vm.why).toEqual({
      positiveChips: ['Ambition alignment'],
      tensionChip: 'Pace',
      reasonShort: 'Shared drive',
      sharedInterestNote: 'Both like hiking',
      interestOverlapTags: ['hiking'],
    });
    expect(vm.recommendation).toEqual({
      primaryTakeaway: 'Strong fit',
      caution: 'Talk early',
      suggestedNextAction: 'Message',
    });
    expect(vm.hardBlock).toBeNull();
  });

  it('maps hardBlock reasons with flattened quotes', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({
        hardBlocked: {
          disabled: true,
          reasons: [
            {
              code: 'DB_AGE',
              dimension: 'AGE',
              direction: 'viewer_to_them',
              message: 'Age mismatch',
              evidence: {
                viewerQuote: '25-30',
                counterpartyQuote: '40',
              },
            },
          ],
        },
      }),
    );

    expect(vm.hardBlock?.reasons[0]).toEqual({
      code: 'DB_AGE',
      dimension: 'AGE',
      direction: 'viewer_to_them',
      message: 'Age mismatch',
      viewerQuote: '25-30',
      counterpartyQuote: '40',
    });
  });

  it('prefers matchScore over priorityScore', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({ matchScore: 80, priorityScore: 10 }),
    );
    expect(vm.score).toBe(80);
  });

  it('falls back to priorityScore when matchScore is null', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({ matchScore: null, priorityScore: 77, priorityTier: undefined }),
    );
    expect(vm.score).toBe(77);
    expect(vm.tier).toBe('GOOD');
  });

  it('treats NaN scores as null and defaults tier to OTHER', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({
        matchScore: Number.NaN,
        priorityScore: Number.NaN,
        priorityTier: undefined,
      }),
    );
    expect(vm.score).toBeNull();
    expect(vm.tier).toBe('OTHER');
  });

  it('trims tensionChip and drops whitespace-only', () => {
    expect(
      mapMeMatchItemToViewModel(
        baseItem({
          explainability: {
            positiveChips: [],
            reasonShort: 'r',
            tensionChip: '  Pace  ',
          },
        }),
      ).why?.tensionChip,
    ).toBe('Pace');

    expect(
      mapMeMatchItemToViewModel(
        baseItem({
          explainability: {
            positiveChips: [],
            reasonShort: 'r',
            tensionChip: '   ',
          },
        }),
      ).why?.tensionChip,
    ).toBeNull();
  });

  it('defaults approvedPhotoCount and maps absent teaser to null', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({ approvedPhotoCount: undefined, teaser: undefined }),
    );
    expect(vm.approvedPhotoCount).toBe(0);
    expect(vm.teaser).toBeNull();
  });

  it('ignores invalid priorityTier and derives from score', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({
        matchScore: 90,
        priorityTier: 'NOPE' as MeMatchItemDto['priorityTier'],
      }),
    );
    expect(vm.tier).toBe('HIGH');
  });

  it('maps empty hardBlock reasons without throwing', () => {
    const vm = mapMeMatchItemToViewModel(
      baseItem({
        hardBlocked: { disabled: true, reasons: [] },
      }),
    );
    expect(vm.hardBlock).toEqual({ disabled: true, reasons: [] });
  });
});

describe('mapMeMatchDetailToViewModel', () => {
  it('maps detail-only fields and does not invent tier/viewerAction', () => {
    const dto: MeMatchDetailDto = {
      id: 'p2',
      nickname: 'Sam',
      gender: 'male',
      ageYears: 28,
      locationLabel: 'Tel Aviv',
      analyzedAt: null,
      hasEvaluation: true,
      evaluationSummary: 'Summary text',
      matchScore: 88,
      matchExplanationTraits: [
        {
          group: 'values',
          label: 'Ambition',
          evidence: 'Both ambitious',
          strength: 'strong',
        },
      ],
      matchNarrative: 'Long narrative',
      explainability: null,
      recommendation: null,
    };

    const vm = mapMeMatchDetailToViewModel(dto);
    expect(vm.summary).toBe('Summary text');
    expect(vm.narrative).toBe('Long narrative');
    expect(vm.traits).toHaveLength(1);
    expect(vm.score).toBe(88);
    expect('tier' in vm).toBe(false);
    expect('viewerAction' in vm).toBe(false);
  });

  it('normalizes missing traits/narrative', () => {
    const vm = mapMeMatchDetailToViewModel({
      id: 'p3',
      nickname: null,
      gender: null,
      ageYears: null,
      locationLabel: null,
      analyzedAt: null,
      hasEvaluation: false,
      evaluationSummary: null,
      matchScore: null,
      explainability: null,
      recommendation: null,
    });
    expect(vm.traits).toEqual([]);
    expect(vm.narrative).toBeNull();
    expect(vm.summary).toBeNull();
  });
});

describe('mapMeMatchesListToViewModel', () => {
  it('maps not_ready envelope', () => {
    const dto: MeMatchesListDto = {
      status: 'not_ready',
      reason: 'no_photo',
    };
    expect(mapMeMatchesListToViewModel(dto)).toEqual({
      status: 'not_ready',
      reason: 'no_photo',
      nextCursor: null,
      hasMore: false,
    });
  });

  it('defaults missing not_ready reason to no_profile', () => {
    expect(
      mapMeMatchesListToViewModel({ status: 'not_ready' }),
    ).toMatchObject({ status: 'not_ready', reason: 'no_profile' });
  });

  it('maps ready envelope and items', () => {
    const dto: MeMatchesListDto = {
      status: 'ready',
      viewerProfileId: 'viewer-1',
      viewerGender: 'female',
      viewerAcceptedPartnerGenders: ['male'],
      viewerProfileAnalysisStale: true,
      totalCandidatesBeforeFilter: 10,
      filteredNoPhotoCandidates: 2,
      budgetExceeded: false,
      matches: [baseItem()],
      nextCursor: 'c1',
      hasMore: true,
    };
    const vm = mapMeMatchesListToViewModel(dto);
    expect(vm.status).toBe('ready');
    if (vm.status !== 'ready') return;
    expect(vm.viewerProfileId).toBe('viewer-1');
    expect(vm.viewerProfileAnalysisStale).toBe(true);
    expect(vm.filteredNoPhotoCandidates).toBe(2);
    expect(vm.matches).toHaveLength(1);
    expect(vm.matches[0]?.tier).toBe('HIGH');
  });

  it('coerces missing matches to empty array', () => {
    const vm = mapMeMatchesListToViewModel({
      status: 'ready',
      viewerProfileId: 'v1',
    });
    expect(vm.status).toBe('ready');
    if (vm.status !== 'ready') return;
    expect(vm.matches).toEqual([]);
    expect(vm.hasMore).toBe(false);
    expect(vm.nextCursor).toBeNull();
  });
});

describe('groupMatchesByPriorityVm', () => {
  it('buckets by tier and hardBlock', () => {
    const high = mapMeMatchItemToViewModel(baseItem({ id: 'h', matchScore: 90, priorityTier: 'HIGH' }));
    const good = mapMeMatchItemToViewModel(baseItem({ id: 'g', matchScore: 75, priorityTier: 'GOOD' }));
    const other = mapMeMatchItemToViewModel(baseItem({ id: 'o', matchScore: 40, priorityTier: 'OTHER' }));
    const blocked = mapMeMatchItemToViewModel(
      baseItem({
        id: 'b',
        matchScore: 95,
        priorityTier: 'HIGH',
        hardBlocked: {
          disabled: true,
          reasons: [
            {
              code: 'X',
              dimension: 'AGE',
              direction: 'viewer_to_them',
              message: 'blocked',
            },
          ],
        },
      }),
    );

    const grouped = groupMatchesByPriorityVm([high, good, other, blocked]);
    expect(grouped.high.map((m) => m.id)).toEqual(['h']);
    expect(grouped.good.map((m) => m.id)).toEqual(['g']);
    expect(grouped.other.map((m) => m.id)).toEqual(['o']);
    expect(grouped.blocked.map((m) => m.id)).toEqual(['b']);
  });
});
