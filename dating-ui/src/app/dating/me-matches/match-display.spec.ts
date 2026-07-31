import { describe, it, expect } from 'vitest';
import {
  matchListPrimaryLabel,
  matchListSecondaryMeta,
  matchDetailSubtitle,
} from './match-display';
import type { MeMatchDetailDto, MeMatchItemDto } from '@/lib/me-matches-api';

const baseItem = {
  id: 'p1',
  nickname: 'toto',
  gender: 'FEMALE',
  ageYears: 81,
  locationLabel: 'e',
  analyzedAt: null,
  hasEvaluation: true,
  matchScore: null,
  explainability: null,
  recommendation: null,
} satisfies MeMatchItemDto;

describe('match-display location junk filter', () => {
  it('hides single-character location on list secondary meta', () => {
    expect(matchListSecondaryMeta(baseItem)).toBe('FEMALE · 81y');
  });

  it('keeps real location labels', () => {
    expect(
      matchListSecondaryMeta({ ...baseItem, locationLabel: 'Tel Aviv' }),
    ).toBe('FEMALE · 81y · Tel Aviv');
  });

  it('hides junk location on detail subtitle', () => {
    const detail = {
      ...baseItem,
      evaluationSummary: null,
      locationLabel: 'e',
    } satisfies MeMatchDetailDto;
    expect(matchDetailSubtitle(detail)).toBe('FEMALE · 81y');
  });

  it('uses meta parts when nickname missing and location is junk', () => {
    expect(
      matchListPrimaryLabel({
        ...baseItem,
        nickname: null,
        locationLabel: 'e',
      }),
    ).toBe('FEMALE · 81y');
  });
});
