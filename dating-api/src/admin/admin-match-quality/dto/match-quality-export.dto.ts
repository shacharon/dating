export type MatchQualityExportSummaryDto = {
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};

export type MatchQualityExportNegativeCandidateDto = {
  matchProfileId: string;
  negativeCount: number;
  distinctViewers: number;
  lastNegativeAt: string;
};

export type MatchQualityExportDto = {
  exportedAt: string;
  windowDays: number;
  windowStart: string;
  summary: MatchQualityExportSummaryDto;
  negativeCandidates: MatchQualityExportNegativeCandidateDto[];
  notes: {
    adoptionRate: null;
    adoptionSource: 'logs_only';
    drillDownHypotheses: 'manual';
  };
};
