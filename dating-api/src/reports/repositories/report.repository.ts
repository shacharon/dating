import type { UserReportReason, UserReportStatus } from '@prisma/client';
import type {
  CreateReportInput,
  MutualMatchParticipants,
  ReportCursorRow,
  ReportRow,
} from './report.repository.types';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface IReportRepository {
  findOpenDuplicateReport(args: {
    reporterUserId: string;
    reportedUserId: string;
    reason: UserReportReason;
    since: Date;
  }): Promise<{ id: string } | null>;
  createReport(data: CreateReportInput): Promise<ReportRow>;
  findProfileUserIdByProfileId(profileId: string): Promise<string | null>;
  findMutualMatchParticipantsById(
    matchId: string,
  ): Promise<MutualMatchParticipants | null>;
  getReportById(reportId: string): Promise<ReportRow | null>;
  findReportCursor(reportId: string): Promise<ReportCursorRow | null>;
  listReportsByStatus(args: {
    status: UserReportStatus;
    take: number;
    cursor?: { createdAt: Date; id: string };
  }): Promise<ReportRow[]>;
  updateReportStatus(
    reportId: string,
    data: { status: UserReportStatus; opsNote: string | null },
  ): Promise<ReportRow>;
}
