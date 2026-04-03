import { COMPATIBILITY_SIGNAL_KEYS, type SignalKey } from '../compatibility/compatibility-score';
import { recomputeAllMatches } from './recompute';
import type { ProfileJsonPayload } from '../profiles/profiles.types';

function makeSignals(overrides: Partial<Record<SignalKey, number>>): Record<string, number> {
  const signals: Record<string, number> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    signals[k] = overrides[k] ?? 5;
  }
  return signals;
}

function makeProfile(id: string, name: string, signals: Record<string, number>): ProfileJsonPayload {
  return {
    id,
    name,
    texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
    evaluation: {
      self: {
        domain: 'self',
        signals,
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0.5 },
      relationship: {
        domain: 'relationship',
        signals: {},
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      compatibility: { selfVsPartner: { overallScore: 50 }, selfVsRelationship: { overallScore: 50 } },
      display: { summary: '', insight: '' },
      productScores: {
        partnerFitScore: 50,
        relationshipFitScore: 50,
        coverageScore: 50,
        frictionRiskScore: 0,
        overallDecisionScore: 50,
        policyVersion: 'product-score-v1',
      },
      flags: [],
    },
    savedAt: new Date().toISOString(),
  };
}

describe('recomputeAllMatches explainability (persistence shape)', () => {
  it('includes explainability on each result so JSON written by recompute-matches retains it', async () => {
    const signals = makeSignals({});
    const a = makeProfile('recompute-ex-a', 'A', signals);
    const b = makeProfile('recompute-ex-b', 'B', signals);

    const results = await recomputeAllMatches([a, b]);

    expect(results).toHaveLength(1);
    const row = results[0]!;
    expect(row.explainability).toBeDefined();
    expect(Array.isArray(row.explainability.positiveChips)).toBe(true);
    expect(row.explainability.positiveChips.length).toBeLessThanOrEqual(3);
    expect(typeof row.explainability.reasonShort).toBe('string');
    expect(row.explainability.reasonShort.length).toBeGreaterThan(0);

    const serialized = JSON.stringify(row);
    expect(serialized).toContain('"explainability"');
    expect(serialized).toContain('"positiveChips"');
    expect(serialized).toContain('"reasonShort"');
  });
});
