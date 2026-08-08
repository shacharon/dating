import { describe, it, expect } from 'vitest';
import { groupMatchesByPriority, resolvePriorityTier } from './match-priority';
import { mapMeMatchItemToViewModel } from '@/lib/matches/map-me-match-to-view-model';
import type { MeMatchItemDto } from '@/lib/me-matches-api';

const baseDto = {
  id: 'p1',
  nickname: 'A',
  gender: 'FEMALE',
  ageYears: 30,
  locationLabel: 'Tel Aviv',
  analyzedAt: null,
  hasEvaluation: true,
  matchScore: 70,
  explainability: null,
  recommendation: null,
} satisfies MeMatchItemDto;

describe('match-priority', () => {
  it('resolvePriorityTier uses mapped tier', () => {
    expect(
      resolvePriorityTier(
        mapMeMatchItemToViewModel({
          ...baseDto,
          priorityTier: 'HIGH',
          matchScore: 40,
        }),
      ),
    ).toBe('HIGH');
    expect(
      resolvePriorityTier(
        mapMeMatchItemToViewModel({ ...baseDto, matchScore: 85 }),
      ),
    ).toBe('HIGH');
    expect(
      resolvePriorityTier(
        mapMeMatchItemToViewModel({ ...baseDto, matchScore: 84 }),
      ),
    ).toBe('GOOD');
    expect(
      resolvePriorityTier(
        mapMeMatchItemToViewModel({ ...baseDto, matchScore: 69 }),
      ),
    ).toBe('OTHER');
    expect(
      resolvePriorityTier(
        mapMeMatchItemToViewModel({ ...baseDto, matchScore: null }),
      ),
    ).toBe('OTHER');
  });

  it('groupMatchesByPriority splits eligible and blocked', () => {
    const grouped = groupMatchesByPriority(
      (
        [
          { ...baseDto, id: 'h', matchScore: 90, priorityTier: 'HIGH' },
          { ...baseDto, id: 'g', matchScore: 75, priorityTier: 'GOOD' },
          { ...baseDto, id: 'o', matchScore: 50, priorityTier: 'OTHER' },
          {
            ...baseDto,
            id: 'b',
            matchScore: 95,
            priorityTier: 'HIGH',
            hardBlocked: {
              disabled: true,
              reasons: [
                {
                  code: 'X',
                  dimension: 'age',
                  direction: 'viewer_to_them',
                  message: 'x',
                },
              ],
            },
          },
        ] as MeMatchItemDto[]
      ).map(mapMeMatchItemToViewModel),
    );
    expect(grouped.high.map((m) => m.id)).toEqual(['h']);
    expect(grouped.good.map((m) => m.id)).toEqual(['g']);
    expect(grouped.other.map((m) => m.id)).toEqual(['o']);
    expect(grouped.blocked.map((m) => m.id)).toEqual(['b']);
  });
});
