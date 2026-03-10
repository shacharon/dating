import {
  detectLifestyleConflicts,
  LIFESTYLE_CONFLICT_KEYS,
} from './lifestyle-conflicts';

function sig(overrides: Record<string, number>): Record<string, number | null> {
  const base: Record<string, number | null> = {
    ambition: 5,
    socialBattery: 5,
    healthBodyConsciousness: 5,
    emotionalDepth: 5,
    attachmentSecurity: 5,
    directness: 5,
    independence: 5,
    traditionalism: 5,
    financialMindset: 5,
    relationshipClarity: 5,
    spirituality: 5,
    lifestylePace: 5,
    physicalPriority: 5,
    statusOrientation: 5,
  };
  return { ...base, ...overrides };
}

describe('detectLifestyleConflicts', () => {
  it('returns empty conflicts and 0 severity when signals are identical', () => {
    const s = sig({});
    const result = detectLifestyleConflicts(s, s);
    expect(result.conflicts).toEqual([]);
    expect(result.severity).toBe(0);
  });

  it('flags pace_mismatch when lifestylePace diff > 3', () => {
    const a = sig({ lifestylePace: 2 });
    const b = sig({ lifestylePace: 6 });
    const result = detectLifestyleConflicts(a, b);
    expect(result.conflicts).toContain('pace_mismatch');
    expect(result.severity).toBeGreaterThanOrEqual(0);
  });

  it('flags status_gap when statusOrientation diff > 4', () => {
    const a = sig({ statusOrientation: 2 });
    const b = sig({ statusOrientation: 8 });
    const result = detectLifestyleConflicts(a, b);
    expect(result.conflicts).toContain('status_gap');
  });

  it('flags social_exposure_gap when socialBattery diff > 4', () => {
    const a = sig({ socialBattery: 1 });
    const b = sig({ socialBattery: 9 });
    const result = detectLifestyleConflicts(a, b);
    expect(result.conflicts).toContain('social_exposure_gap');
  });

  it('flags schedule_conflict when independence diff > 4', () => {
    const a = sig({ independence: 2 });
    const b = sig({ independence: 8 });
    const result = detectLifestyleConflicts(a, b);
    expect(result.conflicts).toContain('schedule_conflict');
  });

  it('flags values_mismatch when 2+ Tier1 gaps > 3 or mean Tier1 gap > 3.5', () => {
    const a = sig({ traditionalism: 2, financialMindset: 2, relationshipClarity: 2 });
    const b = sig({ traditionalism: 7, financialMindset: 7, relationshipClarity: 7 });
    const result = detectLifestyleConflicts(a, b);
    expect(result.conflicts).toContain('values_mismatch');
  });

  it('severity is 0-10', () => {
    const a = sig({ lifestylePace: 1, statusOrientation: 1, socialBattery: 1, independence: 1 });
    const b = sig({ lifestylePace: 10, statusOrientation: 10, socialBattery: 10, independence: 10 });
    const result = detectLifestyleConflicts(a, b);
    expect(result.severity).toBeGreaterThanOrEqual(0);
    expect(result.severity).toBeLessThanOrEqual(10);
  });

  it('conflicts only contain allowed keys', () => {
    const a = sig({ lifestylePace: 1, statusOrientation: 1, socialBattery: 1, independence: 1 });
    const b = sig({ lifestylePace: 10, statusOrientation: 10, socialBattery: 10, independence: 10 });
    const result = detectLifestyleConflicts(a, b);
    for (const c of result.conflicts) {
      expect(LIFESTYLE_CONFLICT_KEYS).toContain(c);
    }
  });
});
