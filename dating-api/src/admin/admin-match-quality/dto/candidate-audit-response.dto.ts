import type { MatchQualityAuditReport } from '../../../me-profile/match-quality-audit';

export type CandidateFeedbackSummaryDto = {
  negativeCount: number;
  positiveCount: number;
  lastSentiment: 'POSITIVE' | 'NEGATIVE' | null;
};

export type CandidateAuditResponseDto = {
  candidateProfileId: string;
  viewerUserId: string;
  windowDays: number;
  feedbackSummary: CandidateFeedbackSummaryDto;
  audit: MatchQualityAuditReport | null;
  auditUnavailable?: {
    code: string;
    message: string;
  };
};
