import { MatchingDimensionResults } from './matching-dimension-result';
import { buildHolyGrailEligibilityAuditV1 } from './build-eligibility-audit';

describe('buildHolyGrailEligibilityAuditV1 — dealbreaker rows', () => {
  const fixedDims = {
    GENDER: MatchingDimensionResults.MATCH,
    AGE: MatchingDimensionResults.SKIPPED,
    PROXIMITY: MatchingDimensionResults.SKIPPED,
  } as const;

  it('joins evidence + confidence from searcher hard signals', () => {
    const audit = buildHolyGrailEligibilityAuditV1({
      searcherProfileId: 's1',
      counterpartyProfileId: 'c1',
      evaluatedAt: new Date('2026-07-11T12:00:00.000Z'),
      dimensions: { ...fixedDims },
      dealbreakerDimensions: {
        smoking: {
          status: 'FAIL',
          reasonCode: 'DEALBREAKER_HARD_EXCLUDE_CONFLICT',
        },
      },
      searcherHardSignals: [
        {
          tag: 'smoking',
          classification: 'HARD_EXCLUDE',
          evidence: "don't want smokers",
          confidence: 0.95,
        },
      ],
    });

    expect(audit.dealbreakerDimensions).toEqual([
      {
        tag: 'smoking',
        result: MatchingDimensionResults.NO_MATCH,
        classification: 'HARD_EXCLUDE',
        evidence: "don't want smokers",
        confidence: 0.95,
        reasonCode: 'DEALBREAKER_HARD_EXCLUDE_CONFLICT',
      },
    ]);
  });

  it('omits dealbreakerDimensions when none evaluated', () => {
    const audit = buildHolyGrailEligibilityAuditV1({
      searcherProfileId: 's1',
      counterpartyProfileId: 'c1',
      evaluatedAt: new Date('2026-07-11T12:00:00.000Z'),
      dimensions: { ...fixedDims },
    });
    expect(audit.dealbreakerDimensions).toBeUndefined();
  });
});
