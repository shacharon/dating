import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  UserReportContextType,
  UserReportStatus,
  type UserReport,
} from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminReportDetailDto } from './dto/admin-report-detail.dto';
import type {
  AdminReportListItemDto,
  ListAdminReportsResponseDto,
} from './dto/list-admin-reports.dto';
import type { UpdateAdminReportDto } from './dto/update-admin-report.dto';

export function buildReportContextPath(
  contextType: UserReportContextType,
  contextId: string,
): string {
  if (contextType === UserReportContextType.MATCH_PROFILE) {
    return `/dating/me-matches/${encodeURIComponent(contextId)}`;
  }
  return `/dating/conversations/${encodeURIComponent(contextId)}`;
}

function sanitizeOpsNote(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const cleaned = raw.replace(/\0/g, '').trim();
  if (!cleaned) {
    return null;
  }
  return cleaned.slice(0, 500);
}

function toListItem(row: UserReport): AdminReportListItemDto {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reporterUserId: row.reporterUserId,
    reportedUserId: row.reportedUserId,
    contextType: row.contextType,
  };
}

function toDetail(row: UserReport): AdminReportDetailDto {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reporterUserId: row.reporterUserId,
    reportedUserId: row.reportedUserId,
    contextType: row.contextType,
    contextId: row.contextId,
    contextPath: buildReportContextPath(row.contextType, row.contextId),
    details: row.details,
    opsNote: row.opsNote,
  };
}

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  async listReports(
    status: UserReportStatus = UserReportStatus.OPEN,
    limit = 50,
    cursor?: string,
  ): Promise<ListAdminReportsResponseDto> {
    const take = Math.min(Math.max(limit, 1), 100);
    let cursorRow: { id: string; createdAt: Date; status: UserReportStatus } | null =
      null;

    if (cursor?.trim()) {
      const row = await this.prisma.userReport.findUnique({
        where: { id: cursor.trim() },
        select: { id: true, createdAt: true, status: true },
      });
      if (row?.status === status) {
        cursorRow = row;
      }
    }

    const rows = await this.prisma.userReport.findMany({
      where: {
        status,
        ...(cursorRow
          ? {
              OR: [
                { createdAt: { lt: cursorRow.createdAt } },
                {
                  createdAt: cursorRow.createdAt,
                  id: { lt: cursorRow.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const page = rows.slice(0, take);
    return {
      items: page.map(toListItem),
      nextCursor: rows.length > take ? page[page.length - 1]!.id : null,
    };
  }

  async getReportById(reportId: string): Promise<AdminReportDetailDto> {
    const row = await this.prisma.userReport.findUnique({
      where: { id: reportId },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'report_not_found',
        message: 'Report was not found.',
      });
    }
    return toDetail(row);
  }

  async updateReportStatus(
    adminUserId: string,
    reportId: string,
    body: UpdateAdminReportDto,
  ): Promise<AdminReportDetailDto> {
    const row = await this.prisma.userReport.findUnique({
      where: { id: reportId },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'report_not_found',
        message: 'Report was not found.',
      });
    }
    if (row.status !== UserReportStatus.OPEN) {
      throw new UnprocessableEntityException({ error: 'report_not_open' });
    }

    const opsNote = sanitizeOpsNote(body.opsNote);
    const updated = await this.prisma.userReport.update({
      where: { id: reportId },
      data: {
        status: body.status,
        opsNote,
      },
    });

    this.obs.trace(
      `event=report_ops_resolved adminUserId=${adminUserId} reportId=${reportId} reportedUserId=${row.reportedUserId} newStatus=${body.status}`,
      ErrorCodes.ADMIN_REPORT_STATUS_UPDATED,
    );
    this.analytics.track(adminUserId, ProductAnalyticsEvents.REPORT_OPS_RESOLVED, {
      status: body.status,
    });

    return toDetail(updated);
  }
}
