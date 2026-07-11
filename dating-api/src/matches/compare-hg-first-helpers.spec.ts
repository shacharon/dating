import type { ProfileJsonPayload } from '../profiles/profiles.types';
import {
  directionsMutualHardPass,
  profileWithNeutralSelfSignalsFallback,
} from './compare-hg-first-helpers';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';

function dir(overall: 'PASS' | 'FAIL'): HolyGrailDirectionalEvaluationResult {
  return {
    dimensions: {} as unknown as HolyGrailDirectionalEvaluationResult['dimensions'],
    dealbreakerDimensions: {},
    overallHardEligibility: overall,
    eligibilityFlags: { children_unsure: false },
  };
}

describe('directionsMutualHardPass', () => {
  it('requires PASS:PASS', () => {
    expect(directionsMutualHardPass({ aToB: dir('PASS'), bToA: dir('PASS') })).toBe(true);
    expect(directionsMutualHardPass({ aToB: dir('PASS'), bToA: dir('FAIL') })).toBe(false);
  });
});

describe('profileWithNeutralSelfSignalsFallback', () => {
  const base = (): ProfileJsonPayload =>
    JSON.parse(
      JSON.stringify({
        id: 'a',
        name: 'A',
        texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
        evaluation: {
          self: { domain: 'self', signals: {}, evidence: [], version: 'v1', confidence: 0.5 },
          partner: {
            domain: 'partner',
            signals: {},
            evidence: [],
            version: 'v1',
            confidence: 0.5,
          },
          relationship: {
            domain: 'relationship',
            signals: {},
            evidence: [],
            version: 'v1',
            confidence: 0.5,
          },
          compatibility: { selfVsPartner: { overallScore: 0 }, selfVsRelationship: { overallScore: 0 } },
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
        savedAt: 'x',
        evaluationStatus: 'DONE',
      }),
    ) as ProfileJsonPayload;

  it('fills missing keys with 5', () => {
    const out = profileWithNeutralSelfSignalsFallback(base());
    expect(out.evaluation.self.signals.ambition).toBe(5);
    expect(out.evaluation.self.signals.relationshipClarity).toBe(5);
  });
});
