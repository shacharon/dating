import {
  calculatePriorityTier,
  toPriorityFields,
  PRIORITY_GOOD_MIN,
  PRIORITY_HIGH_MIN,
} from './match-priority';

describe('match-priority', () => {
  it('exports locked thresholds', () => {
    expect(PRIORITY_HIGH_MIN).toBe(85);
    expect(PRIORITY_GOOD_MIN).toBe(70);
  });

  it('calculatePriorityTier edges', () => {
    expect(calculatePriorityTier(85)).toBe('HIGH');
    expect(calculatePriorityTier(100)).toBe('HIGH');
    expect(calculatePriorityTier(84.9)).toBe('GOOD');
    expect(calculatePriorityTier(70)).toBe('GOOD');
    expect(calculatePriorityTier(69.9)).toBe('OTHER');
    expect(calculatePriorityTier(0)).toBe('OTHER');
    expect(calculatePriorityTier(null)).toBe('OTHER');
    expect(calculatePriorityTier(undefined)).toBe('OTHER');
    expect(calculatePriorityTier(Number.NaN)).toBe('OTHER');
  });

  it('toPriorityFields mirrors finite matchScore', () => {
    expect(toPriorityFields(87)).toEqual({
      priorityScore: 87,
      priorityTier: 'HIGH',
    });
    expect(toPriorityFields(72)).toEqual({
      priorityScore: 72,
      priorityTier: 'GOOD',
    });
    expect(toPriorityFields(40)).toEqual({
      priorityScore: 40,
      priorityTier: 'OTHER',
    });
    expect(toPriorityFields(null)).toEqual({
      priorityScore: null,
      priorityTier: 'OTHER',
    });
  });
});
