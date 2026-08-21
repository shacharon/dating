import { Injectable } from '@nestjs/common';
import type { UserReportReason, UserReportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IReportRepository } from './report.repository';
import type {
  CreateReportInput,
  MutualMatchParticipants,
  ReportCursorRow,
  ReportRow,
} from './report.repository.types';

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOpenDuplicateReport(args: {
    reporterUserId: string;
    reportedUserId: string;
    reason: UserReportReason;
    since: Date;
  }): Promise<{ id: string } | null> {
    return this.prisma.userReport.findFirst({
      where: {
        reporterUserId: args.reporterUserId,
        reportedUserId: args.reportedUserId,
        reason: args.reason,
        status: 'OPEN',
        createdAt: { gte: args.since },
      },
      select: { id: true },
    });
  }

  createReport(data: CreateReportInput): Promise<ReportRow> {
    return this.prisma.userReport.create({ data });
  }

  async findProfileUserIdByProfileId(
    profileId: string,
  ): Promise<string | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  findMutualMatchParticipantsById(
    matchId: string,
  ): Promise<MutualMatchParticipants | null> {
    return this.prisma.mutualMatch.findUnique({
      where: { id: matchId },
      select: { userId1: true, userId2: true, status: true },
    });
  }

  getReportById(reportId: string): Promise<ReportRow | null> {
    return this.prisma.userReport.findUnique({ where: { id: reportId } });
  }

  findReportCursor(reportId: string): Promise<ReportCursorRow | null> {
    return this.prisma.userReport.findUnique({
      where: { id: reportId },
      select: { id: true, createdAt: true, status: true },
    });
  }

  listReportsByStatus(args: {
    status: UserReportStatus;
    take: number;
    cursor?: { createdAt: Date; id: string };
  }): Promise<ReportRow[]> {
    return this.prisma.userReport.findMany({
      where: {
        status: args.status,
        ...(args.cursor
          ? {
              OR: [
                { createdAt: { lt: args.cursor.createdAt } },
                {
                  createdAt: args.cursor.createdAt,
                  id: { lt: args.cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: args.take,
    });
  }

  updateReportStatus(
    reportId: string,
    data: { status: UserReportStatus; opsNote: string | null },
  ): Promise<ReportRow> {
    return this.prisma.userReport.update({
      where: { id: reportId },
      data,
    });
  }
}
