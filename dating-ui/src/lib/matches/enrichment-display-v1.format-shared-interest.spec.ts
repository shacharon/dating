import { describe, expect, it } from 'vitest';
import { formatSharedInterestNote } from './enrichment-display-v1';

describe('formatSharedInterestNote', () => {
  it('returns null for empty input', () => {
    expect(formatSharedInterestNote(undefined)).toBeNull();
    expect(formatSharedInterestNote('')).toBeNull();
  });

  it('relabels snake_case interest codes in the API sentence', () => {
    expect(
      formatSharedInterestNote('You both enjoy hiking, extreme_sports.'),
    ).toBe('You both enjoy Hiking, Extreme sports.');
  });

  it('passes through non-template notes unchanged', () => {
    expect(formatSharedInterestNote('Odd shape without template')).toBe(
      'Odd shape without template',
    );
  });
});
