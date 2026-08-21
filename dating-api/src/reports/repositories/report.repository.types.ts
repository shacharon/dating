import type {
  MutualMatchStatus,
  UserReport,
  UserReportContextType,
  UserReportReason,
  UserReportStatus,
} from '@prisma/client';

export type CreateReportInput = {
  reporterUserId: string;
  reportedUserId: string;
  reason: UserReportReason;
  details: string | null;
  contextType: UserReportContextType;
  contextId: string;
};

export type ReportRow = UserReport;

export type MutualMatchParticipants = {
  userId1: string;
  userId2: string;
  status: MutualMatchStatus;
};

export type ReportCursorRow = {
  id: string;
  createdAt: Date;
  status: UserReportStatus;
};
