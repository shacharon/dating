import type { UserProfileStatus } from '@prisma/client';

export type AnalysisStatusApiStatus =
  | 'pending'
  | 'processing'
  | 'complete'
  | 'failed';

export interface AnalysisStatusResponseDto {
  status: AnalysisStatusApiStatus;
  submittedAt: string | null;
  completedAt?: string | null;
  error?: string | null;
  profileStatus: UserProfileStatus;
  analysisJobId?: string | null;
}

export function mapProfileStatusToAnalysisApi(
  status: UserProfileStatus,
): AnalysisStatusApiStatus {
  switch (status) {
    case 'SUBMITTED':
      return 'pending';
    case 'ANALYZING':
      return 'processing';
    case 'FAILED':
      return 'failed';
    case 'ANALYZED':
    case 'DRAFT':
    default:
      return 'complete';
  }
}
