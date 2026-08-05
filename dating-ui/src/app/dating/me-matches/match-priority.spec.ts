import { describe, it, expect } from 'vitest';
import { groupMatchesByPriority, resolvePriorityTier } from './match-priority';
import type { MeMatchItemDto } from '@/lib/me-matches-api';

const base = {
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
  it('resolvePriorityTier prefers API field then score', () => {
    expect(resolvePriorityTier({ ...base, priorityTier: 'HIGH', matchScore: 40 })).toBe(
      'HIGH',
    );
    expect(resolvePriorityTier({ ...base, matchScore: 85 })).toBe('HIGH');
    expect(resolvePriorityTier({ ...base, matchScore: 84 })).toBe('GOOD');
    expect(resolvePriorityTier({ ...base, matchScore: 69 })).toBe('OTHER');
    expect(resolvePriorityTier({ ...base, matchScore: null })).toBe('OTHER');
  });

  it('groupMatchesByPriority splits eligible and blocked', () => {
    const grouped = groupMatchesByPriority([
      { ...base, id: 'h', matchScore: 90, priorityTier: 'HIGH' },
      { ...base, id: 'g', matchScore: 75, priorityTier: 'GOOD' },
      { ...base, id: 'o', matchScore: 50, priorityTier: 'OTHER' },
      {
        ...base,
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
    ]);
    expect(grouped.high.map((m) => m.id)).toEqual(['h']);
    expect(grouped.good.map((m) => m.id)).toEqual(['g']);
    expect(grouped.other.map((m) => m.id)).toEqual(['o']);
    expect(grouped.blocked.map((m) => m.id)).toEqual(['b']);
  });
});
