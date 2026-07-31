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

  it('groups a single dense block into 2–3 paragraphs', () => {
    const text =
      'One sentence here. Two sentence here. Three sentence here. Four sentence here. Five sentence here. Six sentence here.';
    const paragraphs = splitNarrativeParagraphs(text);
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs.length).toBeLessThanOrEqual(3);
    expect(paragraphs.join(' ')).toContain('One sentence here.');
    expect(paragraphs.join(' ')).toContain('Six sentence here.');
  });

  it('keeps very short blocks as one paragraph', () => {
    expect(splitNarrativeParagraphs('Just one. And two.')).toEqual([
      'Just one. And two.',
    ]);
  });
});
