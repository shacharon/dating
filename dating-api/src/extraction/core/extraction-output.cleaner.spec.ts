import { validateAndClean } from './extraction-output.cleaner';

describe('extraction-output.cleaner (sprint-58 story 3)', () => {
  it('rounds in-range signals and nulls out-of-range via onStripped', () => {
    const onStripped = jest.fn();
    const cleaned = validateAndClean(
      {
        domain: 'self',
        signals: {
          ambition: 7.4,
          directness: 99,
          socialBattery: null,
        } as never,
        evidence: [
          { signal: 'ambition', quote: 'driven', reason: 'Drive cue' },
          { signal: 'notARealKey', quote: 'x', reason: 'drop me' },
        ],
        confidence: 0.7,
        version: 'v1',
        rawInterests: ['Cooking', 'cooking', 'NotAllowlisted'],
      },
      'self',
      onStripped,
    );

    expect(cleaned.signals.ambition).toBe(7);
    expect(cleaned.signals.directness).toBeNull();
    expect(onStripped).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'validateAndClean_stripped',
        key: 'directness',
        reason: 'outOfRange',
      }),
    );
    expect(cleaned.evidence.map((e) => e.signal)).toEqual(['ambition']);
    expect(cleaned.domain).toBe('self');
  });

  it('validateAndClean without onStripped still cleans (mirror path)', () => {
    const cleaned = validateAndClean(
      {
        domain: 'partner',
        signals: { physicalPriority: 8 } as never,
        evidence: [],
        confidence: 0.5,
        version: 'v1',
      },
      'partner',
    );
    expect(cleaned.signals.physicalPriority).toBe(8);
  });
});
