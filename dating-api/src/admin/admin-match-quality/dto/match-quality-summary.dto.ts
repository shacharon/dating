export type MatchQualitySummaryDto = {
  windowDays: number;
  windowStart: string;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};
