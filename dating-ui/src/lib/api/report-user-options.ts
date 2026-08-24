/** Mirror dating-api UserReportReason wire values. */

export const USER_REPORT_REASON_VALUES = [
  'HARASSMENT',
  'SPAM',
  'FAKE_PROFILE',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
] as const;

export type UserReportReason = (typeof USER_REPORT_REASON_VALUES)[number];

export type UserReportContextType = 'MATCH_PROFILE' | 'CONVERSATION';

export interface CreateUserReportBody {
  reason: UserReportReason;
  details?: string | null;
  contextType: UserReportContextType;
  contextId: string;
}

export interface UserReportResponseDto {
  id: string;
  reason: UserReportReason;
  status: string;
  createdAt: string;
  contextType: UserReportContextType;
  contextId: string;
}
