import type {
  UserReportContextType,
  UserReportReason,
  UserReportStatus,
} from '@prisma/client';

export type AdminReportDetailDto = {
  id: string;
  reason: UserReportReason;
  status: UserReportStatus;
  createdAt: string;
  updatedAt: string;
  reporterUserId: string;
  reportedUserId: string;
  contextType: UserReportContextType;
  contextId: string;
  contextPath: string;
  details: string | null;
  opsNote: string | null;
};
