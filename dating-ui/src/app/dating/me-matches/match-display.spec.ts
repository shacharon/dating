import { describe, it, expect } from 'vitest';
import {
  matchListPrimaryLabel,
  matchListSecondaryMeta,
  matchDetailSubtitle,
  matchBrowseOneLiner,
  formatBrowseAge,
  matchBrowseLocation,
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

describe('match-display browse helpers', () => {
  it('formats plain age and hides junk location', () => {
    expect(formatBrowseAge(32)).toBe('32');
    expect(formatBrowseAge(null)).toBeNull();
    expect(matchBrowseLocation(baseItem)).toBeNull();
    expect(
      matchBrowseLocation({ ...baseItem, locationLabel: 'Tel Aviv' }),
    ).toBe('Tel Aviv');
  });

  it('prefers takeaway then shared note then first chip', () => {
    expect(
      matchBrowseOneLiner({
        ...baseItem,
        recommendation: {
          explainability: {
            positiveChips: ['Chip'],
            reasonShort: 'Short',
          },
          primaryTakeaway: 'Takeaway line',
          suggestedNextAction: 'Next',
        },
      }),
    ).toBe('Takeaway line');

    expect(
      matchBrowseOneLiner({
        ...baseItem,
        explainability: {
          positiveChips: ['Chip A'],
          reasonShort: 'Short',
          sharedInterestNote: 'You both enjoy hiking.',
        },
      }),
    ).toMatch(/hiking/i);

    expect(
      matchBrowseOneLiner({
        ...baseItem,
        explainability: {
          positiveChips: ['Chip A'],
          reasonShort: 'Short',
        },
      }),
    ).toBe('Chip A');
  });
});
