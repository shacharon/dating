import { describe, expect, it } from 'vitest';
import {
  resolveDetailProse,
  splitNarrativeParagraphs,
} from './match-detail-prose';

describe('resolveDetailProse', () => {
  it('prefers narrative over short takeaway', () => {
    expect(
      resolveDetailProse({
        narrative: '  Long narrative about shared depth.  ',
        recommendation: {
          primaryTakeaway: 'Takeaway',
          caution: null,
          suggestedNextAction: 'Next',
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
        narrative: null,
        recommendation: {
          primaryTakeaway: 'Takeaway',
          caution: null,
          suggestedNextAction: 'Next',
        },
      }),
    ).toEqual({ kind: 'short', text: 'Takeaway' });

    expect(
      resolveDetailProse({
        narrative: null,
        recommendation: null,
      }),
    ).toBeNull();
  });

  it('returns null when nothing usable', () => {
    expect(
      resolveDetailProse({
        narrative: '   ',
        recommendation: null,
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
