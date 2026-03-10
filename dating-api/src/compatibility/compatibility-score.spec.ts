import {
  COMPATIBILITY_SIGNAL_KEYS,
  TIER1_KEYS,
  TIER3_KEYS,
  computeCompatibility,
  computeValuesAlignment,
  MAX_COVERAGE_PENALTY_PERCENT,
  HARD_MISMATCH_PENALTY_PER_ITEM,
  type SignalKey,
  type SignalsMap,
  type SignalValue,
} from './compatibility-score';

function fullMap(overrides: Partial<Record<SignalKey, SignalValue>>): SignalsMap {
  const out: Record<string, SignalValue> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    out[k] = overrides[k] ?? 5;
  }
  return out as SignalsMap;
}

describe('computeCompatibility', () => {
  it('perfect match: same non-null values for all keys', () => {
    const self = fullMap({});
    const partner = fullMap({});
    const result = computeCompatibility(self, partner);

    expect(result.coverage).toBe(1);
    expect(result.matchedSignals).toBe(14);
    expect(result.hardMismatches).toHaveLength(0);
    expect(result.breakdown.every((e) => e.pairScore === 10)).toBe(true);
    expect(result.overallScore).toBe(100);
  });

  it('many nulls: low coverage', () => {
    const self = fullMap({
      ambition: 8,
      emotionalDepth: 7,
      directness: 6,
    });
    const partner: Record<string, SignalValue> = {
      ...fullMap({}),
      ambition: null,
      socialBattery: null,
      healthBodyConsciousness: null,
      emotionalDepth: 7,
      attachmentSecurity: null,
      directness: 6,
      independence: null,
      traditionalism: null,
      financialMindset: null,
      relationshipClarity: null,
      spirituality: null,
      lifestylePace: null,
      physicalPriority: null,
      statusOrientation: null,
    };
    const result = computeCompatibility(self, partner);

    expect(result.matchedSignals).toBe(2);
    expect(result.coverage).toBeLessThan(0.5);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveLength(2);
  });

  it('one severe mismatch: spirituality 10 vs 1', () => {
    const self = fullMap({ spirituality: 10 });
    const partner = fullMap({ spirituality: 1 });
    const result = computeCompatibility(self, partner);

    expect(result.hardMismatches).toHaveLength(1);
    expect(result.hardMismatches[0].key).toBe('spirituality');
    expect(result.hardMismatches[0].gap).toBe(9);
    expect(result.hardMismatches[0].self).toBe(10);
    expect(result.hardMismatches[0].partner).toBe(1);
    expect(result.hardMismatches[0].reason).toContain('spirituality');
    expect(result.hardMismatches[0].reason).toContain('9');
    expect(result.overallScore).toBeLessThan(100);
  });

  it('mixed profile with realistic values', () => {
    const self = fullMap({
      ambition: 8,
      emotionalDepth: 7,
      financialMindset: 6,
      spirituality: 2,
      lifestylePace: 7,
      physicalPriority: 5,
      statusOrientation: 6,
    });
    const partner = fullMap({
      ambition: 6,
      emotionalDepth: 3,
      financialMindset: 8,
      spirituality: 9,
      lifestylePace: 4,
      physicalPriority: 6,
      statusOrientation: 3,
    });
    const result = computeCompatibility(self, partner);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThanOrEqual(1);
    expect(result.breakdown.length).toBe(result.matchedSignals);
    const hardKeys = result.hardMismatches.map((h) => h.key);
    for (const h of result.hardMismatches) {
      expect(h.gap).toBeGreaterThanOrEqual(7);
      expect(['emotionalDepth', 'financialMindset', 'spirituality', 'lifestylePace', 'physicalPriority', 'statusOrientation']).toContain(h.key);
    }
  });

  it('weights affect score: same gap on high-weight key hurts more than on low-weight key', () => {
    const base = fullMap({});
    const partnerA = fullMap({ emotionalDepth: 0 }); // self 5, partner 0 -> gap 5 (high weight)
    const partnerB = fullMap({ ambition: 0 }); // self 5, partner 0 -> gap 5 (lower weight)
    const resultA = computeCompatibility(base, partnerA);
    const resultB = computeCompatibility(base, partnerB);

    expect(resultA.overallScore).toBeLessThan(resultB.overallScore);
    expect(resultA.debug).toBeDefined();
    expect(resultB.debug).toBeDefined();
    expect(resultA.debug!.weightedScoreBeforePenalties).toBeLessThan(
      resultB.debug!.weightedScoreBeforePenalties,
    );
  });

  it('penalty caps are respected', () => {
    const full = fullMap({});
    const oneKey = fullMap({});
    for (const k of COMPATIBILITY_SIGNAL_KEYS) {
      if (k !== 'ambition') (oneKey as Record<string, SignalValue>)[k] = null;
    }
    const partnerOneKey: Record<string, SignalValue> = { ...fullMap({}) };
    for (const k of COMPATIBILITY_SIGNAL_KEYS) {
      if (k !== 'ambition') partnerOneKey[k] = null;
    }
    const resultLowCoverage = computeCompatibility(oneKey, partnerOneKey);

    expect(resultLowCoverage.debug).toBeDefined();
    expect(resultLowCoverage.debug!.coveragePenaltyApplied).toBeLessThanOrEqual(
      MAX_COVERAGE_PENALTY_PERCENT / 100,
    );
    expect(resultLowCoverage.debug!.coveragePenaltyApplied).toBeGreaterThanOrEqual(0);

    const resultFull = computeCompatibility(full, full);
    expect(resultFull.debug!.hardMismatchPenaltyApplied).toBe(0);
    const withOneHard = fullMap({ spirituality: 10 });
    const partnerHard = fullMap({ spirituality: 1 });
    const resultHard = computeCompatibility(withOneHard, partnerHard);
    expect(resultHard.debug!.hardMismatchPenaltyApplied).toBe(
      1 * HARD_MISMATCH_PENALTY_PER_ITEM,
    );
  });

  it('tier definitions cover all signal keys exactly once (plus ambition untiered)', () => {
    const tiered = new Set([...TIER1_KEYS, ...TIER3_KEYS]);
    const TIER2_KEYS_LOCAL: readonly SignalKey[] = [
      'emotionalDepth',
      'independence',
      'directness',
      'socialBattery',
    ];
    const all = new Set([...tiered, ...TIER2_KEYS_LOCAL, 'ambition']);
    expect(all.size).toBe(COMPATIBILITY_SIGNAL_KEYS.length);
    for (const k of COMPATIBILITY_SIGNAL_KEYS) {
      expect(all.has(k)).toBe(true);
    }
  });

  it('output is deterministic', () => {
    const self = fullMap({ emotionalDepth: 7, spirituality: 3 });
    const partner = fullMap({ emotionalDepth: 4, spirituality: 8 });
    const a = computeCompatibility(self, partner);
    const b = computeCompatibility(self, partner);

    expect(a.overallScore).toBe(b.overallScore);
    expect(a.coverage).toBe(b.coverage);
    expect(a.matchedSignals).toBe(b.matchedSignals);
    expect(a.hardMismatches.length).toBe(b.hardMismatches.length);
    expect(a.breakdown.length).toBe(b.breakdown.length);
    if (a.debug && b.debug) {
      expect(a.debug.comparedKeys).toBe(b.debug.comparedKeys);
      expect(a.debug.totalKeys).toBe(b.debug.totalKeys);
      expect(a.debug.weightedScoreBeforePenalties).toBe(
        b.debug.weightedScoreBeforePenalties,
      );
      expect(a.debug.coveragePenaltyApplied).toBe(b.debug.coveragePenaltyApplied);
      expect(a.debug.hardMismatchPenaltyApplied).toBe(
        b.debug.hardMismatchPenaltyApplied,
      );
    }
  });
});

describe('computeValuesAlignment', () => {
  it('returns 100 when all Tier1 signals match perfectly', () => {
    const signals = fullMap({});
    expect(computeValuesAlignment(signals, signals)).toBe(100);
  });

  it('returns 0 when no Tier1 signals are present', () => {
    const onlyTier3: Record<string, SignalValue> = {
      physicalPriority: 8,
      healthBodyConsciousness: 7,
      statusOrientation: 5,
    };
    expect(computeValuesAlignment(onlyTier3, onlyTier3)).toBe(0);
  });

  it('returns 0 when one side has null Tier1 values', () => {
    const a = fullMap({});
    const b: Record<string, SignalValue> = {};
    for (const k of TIER1_KEYS) b[k] = null;
    b['physicalPriority'] = 5;
    expect(computeValuesAlignment(a, b)).toBe(0);
  });

  it('scores lower when Tier1 gaps are large', () => {
    const a = fullMap({
      traditionalism: 1, financialMindset: 1, relationshipClarity: 1,
      lifestylePace: 1, spirituality: 1, attachmentSecurity: 1,
    });
    const b = fullMap({
      traditionalism: 9, financialMindset: 9, relationshipClarity: 9,
      lifestylePace: 9, spirituality: 9, attachmentSecurity: 9,
    });
    const score = computeValuesAlignment(a, b);
    expect(score).toBeLessThan(30);
  });

  it('ignores Tier2 and Tier3 keys', () => {
    const base = fullMap({});
    const diffTier3 = fullMap({ physicalPriority: 1, healthBodyConsciousness: 1, statusOrientation: 1 });
    expect(computeValuesAlignment(base, diffTier3)).toBe(
      computeValuesAlignment(base, fullMap({})),
    );
  });

  it('is deterministic', () => {
    const a = fullMap({ lifestylePace: 8, spirituality: 3 });
    const b = fullMap({ lifestylePace: 4, spirituality: 7 });
    expect(computeValuesAlignment(a, b)).toBe(computeValuesAlignment(a, b));
  });
});
