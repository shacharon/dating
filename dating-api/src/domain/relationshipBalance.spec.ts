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

  it('tier is GREEN when ratio >= 4', () => {
    const result = computeRelationshipBalance({
      signalsA: { ...baseSignals },
      signalsB: { ...baseSignals },
      motivationA: 'emotional_connection',
      motivationB: 'emotional_connection',
      dealbreakers: [],
    });

    expect(result.ratio).toBeGreaterThanOrEqual(4);
    expect(result.tier).toBe('GREEN');
    expect(result.positiveScore).toBeGreaterThan(0);
    expect(result.negativeScore).toBe(0.5);
  });

  it('tier is YELLOW when ratio >= 2 and < 4', () => {
    const result = computeRelationshipBalance({
      signalsA: { ...baseSignals },
      signalsB: { ...baseSignals },
      motivationA: 'emotional_connection',
      motivationB: 'emotional_connection',
      dealbreakers: [{ code: 'STATUS_GAP_SENSITIVE', severity: 'STRONG_FLAG', evidence: [] }],
    });

    expect(result.ratio).toBeGreaterThanOrEqual(2);
    expect(result.ratio).toBeLessThan(4);
    expect(result.tier).toBe('YELLOW');
  });

  it('tier is RED when ratio < 2', () => {
    const result = computeRelationshipBalance({
      signalsA: { emotionalDepth: 2, directness: 3 },
      signalsB: { emotionalDepth: 2, directness: 3 },
      dealbreakers: [
        { code: 'EMOTIONAL_DEPTH_FLOOR', severity: 'STRONG_FLAG', evidence: [] },
        { code: 'VISIBILITY_NEED_MISMATCH', severity: 'HARD', evidence: [] },
      ],
    });

    expect(result.ratio).toBeLessThan(2);
    expect(result.tier).toBe('RED');
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
