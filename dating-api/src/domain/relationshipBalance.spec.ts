import { computeRelationshipBalance } from './relationshipBalance';

describe('computeRelationshipBalance', () => {
  const baseSignals = {
    directness: 7,
    attachmentSecurity: 7,
    lifestylePace: 5,
    socialBattery: 5,
    independence: 5,
    financialMindset: 5,
    emotionalDepth: 6,
  };

  it('ratio >= 4 when signals align and dealbreaker load is minimal', () => {
    const result = computeRelationshipBalance({
      signalsA: { ...baseSignals },
      signalsB: { ...baseSignals },
      motivationA: 'emotional_connection',
      motivationB: 'emotional_connection',
      dealbreakers: [],
    });

    expect(result.ratio).toBeGreaterThanOrEqual(4);
    expect(result.positiveScore).toBeGreaterThan(0);
    expect(result.negativeScore).toBe(0.5);
  });

  it('ratio >= 2 and < 4 under moderate dealbreaker severity', () => {
    const result = computeRelationshipBalance({
      signalsA: { ...baseSignals },
      signalsB: { ...baseSignals },
      motivationA: 'emotional_connection',
      motivationB: 'emotional_connection',
      dealbreakers: [{ code: 'STATUS_GAP_SENSITIVE', severity: 'STRONG_FLAG', evidence: [] }],
    });

    expect(result.ratio).toBeGreaterThanOrEqual(2);
    expect(result.ratio).toBeLessThan(4);
  });

  it('bilateral low emotionalDepth without dealbreakers keeps baseline negativeScore', () => {
    const result = computeRelationshipBalance({
      signalsA: { emotionalDepth: 2, directness: 3 },
      signalsB: { emotionalDepth: 2, directness: 3 },
      dealbreakers: [],
    });

    expect(result.negativeScore).toBe(0.5);
  });

  it('ratio < 2 when negative score dominates', () => {
    const result = computeRelationshipBalance({
      signalsA: { emotionalDepth: 2, directness: 3 },
      signalsB: { emotionalDepth: 2, directness: 3 },
      dealbreakers: [
        { code: 'EMOTIONAL_DEPTH_FLOOR', severity: 'PENALTY', evidence: [] },
        { code: 'VISIBILITY_NEED_MISMATCH', severity: 'HARD', evidence: [] },
      ],
    });

    expect(result.ratio).toBeLessThan(2);
    expect(result.negativeScore).toBeGreaterThan(result.positiveScore);
  });

  it('returns top 3 reasons', () => {
    const result = computeRelationshipBalance({
      signalsA: { ...baseSignals, directness: 8, attachmentSecurity: 8 },
      signalsB: { ...baseSignals, directness: 8, attachmentSecurity: 8 },
      motivationA: 'family_builder',
      motivationB: 'family_builder',
      dealbreakers: [],
    });

    expect(result.reasons.length).toBeLessThanOrEqual(3);
    expect(Array.isArray(result.reasons)).toBe(true);
  });
});
