import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  matchListPrimaryLabel,
  matchListSecondaryMeta,
  matchDetailSubtitle,
  matchBrowseOneLiner,
  resolveMatchBrowseHook,
  resolveMatchBrowseClaim,
  resolveMatchBrowseHybridLines,
  resolveBrowseTeaserMode,
  TEASER_MODE_PREVIEW_STORAGE_KEY,
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
  beforeEach(() => {
    localStorage.removeItem(TEASER_MODE_PREVIEW_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TEASER_MODE_PREVIEW_STORAGE_KEY);
  });

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

  it('resolveMatchBrowseHook uses teaser line for first_chapter', () => {
    expect(
      resolveMatchBrowseHook(
        {
          ...baseItem,
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Legacy takeaway should not win',
            suggestedNextAction: 'Next',
          },
          teaser: {
            mode: 'first_chapter',
            lines: ['Both night owls · hiking + markets'],
            showScore: true,
            score: 80,
          },
        },
        'A little in common — open to see more',
      ),
    ).toBe('Both night owls · hiking + markets');
  });

  it('resolveMatchBrowseHook falls back to hookEmpty when teaser blank', () => {
    expect(
      resolveMatchBrowseHook(
        {
          ...baseItem,
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Should not appear for Mode A',
            suggestedNextAction: 'Next',
          },
        },
        'A little in common — open to see more',
      ),
    ).toBe('A little in common — open to see more');
  });

  it('resolveMatchBrowseHook uses legacy one-liner for non–first_chapter modes', () => {
    expect(
      resolveMatchBrowseHook(
        {
          ...baseItem,
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Mode B legacy line',
            suggestedNextAction: 'Next',
          },
          teaser: {
            mode: 'ready_again',
            lines: [],
            claim: 'Both want something serious',
            showScore: true,
            score: 92,
          },
        },
        'A little in common — open to see more',
      ),
    ).toBe('Mode B legacy line');
  });

  it('resolveMatchBrowseClaim prefers claim and strips quotes', () => {
    expect(
      resolveMatchBrowseClaim(
        {
          ...baseItem,
          teaser: {
            mode: 'ready_again',
            lines: [],
            claim: '“Both want something serious — kids already clear”',
            showScore: true,
            score: 92,
          },
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Hobby fluff should not win',
            suggestedNextAction: 'Next',
          },
        },
        'Strong life-goal fit — open for details',
      ),
    ).toBe('Both want something serious — kids already clear');
  });

  it('resolveMatchBrowseClaim falls back to claimEmpty without inventing from takeaway', () => {
    expect(
      resolveMatchBrowseClaim(
        {
          ...baseItem,
          teaser: {
            mode: 'ready_again',
            lines: [],
            showScore: true,
            score: 90,
          },
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Should not appear',
            suggestedNextAction: 'Next',
          },
        },
        'Strong life-goal fit — open for details',
      ),
    ).toBe('Strong life-goal fit — open for details');
  });

  it('resolveBrowseTeaserMode honors localStorage preview', () => {
    localStorage.setItem(TEASER_MODE_PREVIEW_STORAGE_KEY, 'ready_again');
    expect(
      resolveBrowseTeaserMode({
        ...baseItem,
        teaser: {
          mode: 'first_chapter',
          lines: ['hook'],
          showScore: true,
          score: 80,
        },
      }),
    ).toBe('ready_again');
    localStorage.removeItem(TEASER_MODE_PREVIEW_STORAGE_KEY);
  });

  it('resolveMatchBrowseHybridLines prefers lines and does not invent line2', () => {
    expect(
      resolveMatchBrowseHybridLines(
        {
          ...baseItem,
          teaser: {
            mode: 'new_chapter',
            lines: [
              '88% · both want a real partnership',
              'Kids situation aligned · same city · ask about her travel',
            ],
            showScore: true,
            score: 88,
          },
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Should not appear',
            suggestedNextAction: 'Next',
          },
        },
        'Clear life-goal overlap — open to learn more',
      ),
    ).toEqual({
      line1: '88% · both want a real partnership',
      line2: 'Kids situation aligned · same city · ask about her travel',
    });

    expect(
      resolveMatchBrowseHybridLines(
        {
          ...baseItem,
          teaser: {
            mode: 'new_chapter',
            lines: ['88% · both want a real partnership'],
            showScore: true,
            score: 88,
          },
        },
        'Clear life-goal overlap — open to learn more',
      ),
    ).toEqual({
      line1: '88% · both want a real partnership',
      line2: null,
    });
  });

  it('resolveMatchBrowseHybridLines falls back to linesEmpty without takeaway invent', () => {
    expect(
      resolveMatchBrowseHybridLines(
        {
          ...baseItem,
          teaser: {
            mode: 'new_chapter',
            lines: [],
            showScore: true,
            score: 88,
          },
          recommendation: {
            explainability: {
              positiveChips: ['Chip'],
              reasonShort: 'Short',
            },
            primaryTakeaway: 'Should not appear',
            suggestedNextAction: 'Next',
          },
        },
        'Clear life-goal overlap — open to learn more',
      ),
    ).toEqual({
      line1: 'Clear life-goal overlap — open to learn more',
      line2: null,
    });

    expect(
      resolveMatchBrowseHybridLines(
        {
          ...baseItem,
          teaser: {
            mode: 'new_chapter',
            lines: ['   ', '  '],
            showScore: true,
            score: 88,
          },
        },
        'Clear life-goal overlap — open to learn more',
      ),
    ).toEqual({
      line1: 'Clear life-goal overlap — open to learn more',
      line2: null,
    });
  });
});

describe('Mode B i18n (HE modeled copy)', () => {
  it('ships Story 03 HE strings for sublabel / expand / claimEmpty', async () => {
    const { heCopy } = await import('@/lib/i18n/he');
    expect(heCopy.matches.list.browse.modeB.sublabel).toBe(
      'למה זה שווה את הזמן שלך',
    );
    expect(heCopy.matches.list.browse.modeB.whyExpand).toBe('לראות את כל הסיבה');
    expect(heCopy.matches.list.browse.modeB.claimEmpty).toBe(
      'התאמה חזקה במטרות — כדאי לפתוח',
    );
    expect(heCopy.matches.list.browse.modeB.scoreAria(92)).toContain('92');
  });
});

describe('Mode C i18n (HE modeled copy)', () => {
  it('ships Story 04 HE strings for section / expand / linesEmpty', async () => {
    const { heCopy } = await import('@/lib/i18n/he');
    expect(heCopy.matches.list.browse.modeC.sectionLabel).toBe('מה מסתדר');
    expect(heCopy.matches.list.browse.modeC.whyExpand).toBe('כל הסיבה');
    expect(heCopy.matches.list.browse.modeC.linesEmpty).toBe(
      'יש חפיפה ברורה במטרות — כדאי לפתוח',
    );
  });

  it('Mode C chrome has no pity or ageist labels (EN/HE/ES)', async () => {
    const { enCopy } = await import('@/lib/i18n/en');
    const { heCopy } = await import('@/lib/i18n/he');
    const { esCopy } = await import('@/lib/i18n/es');
    const banned =
      /younger|senior|mature singles|second chance|despite your divorce|gen[- ]?z/i;
    for (const locale of [enCopy, heCopy, esCopy]) {
      const { sectionLabel, whyExpand, linesEmpty } = locale.matches.list.browse.modeC;
      expect(sectionLabel).not.toMatch(banned);
      expect(whyExpand).not.toMatch(banned);
      expect(linesEmpty).not.toMatch(banned);
    }
  });
});
