export type MatchQualityPeriodSummaryDto = {
  rangeStart: string;
  rangeEnd: string;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};

export type MatchQualityCompareDto = {
  comparedAt: string;
  before: MatchQualityPeriodSummaryDto;
  after: MatchQualityPeriodSummaryDto;
  deltas: {
    positiveRateDelta: number | null;
    feedbackCountDelta: number;
  };
  notes: {
    adoptionComparison: 'logs_only';
    rollbackHint: 'positive_rate_drop_gt_0.10_with_stable_adoption';
  };
};
