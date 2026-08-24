import {
  normalizeRawExtraction,
  normalizeRawInterestTags,
  parseRawInterestArray,
} from './extraction-normalization';

describe('interest rawInterests normalization', () => {
  it('parseRawInterestArray prefers rawInterests over interests', () => {
    expect(
      parseRawInterestArray({
        rawInterests: ['biking'],
        interests: ['camping'],
      }),
    ).toEqual(['biking']);
  });

  it('parseRawInterestArray falls back to interests', () => {
    expect(parseRawInterestArray({ interests: [' nature ', ''] })).toEqual([
      'nature',
    ]);
  });

  it('normalizeRawInterestTags allowlists and case-normalizes', () => {
    expect(
      normalizeRawInterestTags(['Nature', 'Running', 'biking', 'biking']),
    ).toEqual(['nature', 'biking']);
  });

  it('normalizeRawExtraction maps interests onto rawInterests', () => {
    const out = normalizeRawExtraction(
      {
        domain: 'self',
        signals: {},
        interests: ['camping', 'NotATag'],
        evidence: [],
        confidence: 0.5,
      },
      'self',
    );
    expect(out.rawInterests).toEqual(['camping', 'NotATag']);
  });
});
