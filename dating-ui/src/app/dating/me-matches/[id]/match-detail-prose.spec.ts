import { describe, expect, it } from 'vitest';
import {
  resolveDetailProse,
  splitNarrativeParagraphs,
} from './match-detail-prose';

describe('resolveDetailProse', () => {
  it('prefers matchNarrative over short takeaway', () => {
    expect(
      resolveDetailProse({
        matchNarrative: '  Long narrative about shared depth.  ',
        recommendation: {
          explainability: {
            positiveChips: [],
            reasonShort: 'Short',
          },
          primaryTakeaway: 'Takeaway',
          suggestedNextAction: 'Next',
        },
        explainability: {
          positiveChips: [],
          reasonShort: 'Reason',
        },
      }),
    ).toEqual({
      kind: 'narrative',
      text: 'Long narrative about shared depth.',
    });
  });

  it('falls back to primaryTakeaway only (never reasonShort)', () => {
    expect(
      resolveDetailProse({
        recommendation: {
          explainability: {
            positiveChips: [],
            reasonShort: 'Reason',
          },
          primaryTakeaway: 'Takeaway',
          suggestedNextAction: 'Next',
        },
        explainability: {
          positiveChips: [],
          reasonShort: 'Reason',
        },
      }),
    ).toEqual({ kind: 'short', text: 'Takeaway' });

    expect(
      resolveDetailProse({
        recommendation: null,
        explainability: {
          positiveChips: [],
          reasonShort: 'You share real overlap on Ambition alignment',
        },
      }),
    ).toBeNull();
  });

  it('returns null when nothing usable', () => {
    expect(
      resolveDetailProse({
        matchNarrative: '   ',
        recommendation: null,
        explainability: null,
      }),
    ).toBeNull();
  });
});

describe('splitNarrativeParagraphs', () => {
  it('splits on newlines and drops empties', () => {
    expect(
      splitNarrativeParagraphs('First.\n\nSecond.\nThird.'),
    ).toEqual(['First.', 'Second.', 'Third.']);
  });
});
