import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MutualMatchStatus, UserReportContextType } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { ReportOpsEmailService } from '../notifications/report-ops-email.service';
import type {
  CreateUserReportDto,
  UserReportResponseDto,
} from './dto/create-user-report.dto';
import {
  REPORT_REPOSITORY,
  type IReportRepository,
} from './repositories/report.repository';
import type { ReportRow } from './repositories/report.repository.types';

const REPORT_DEBOUNCE_MS = 24 * 60 * 60 * 1000;

export function sanitizeReportDetails(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }
  const cleaned = raw.replace(/\0/g, '').trim();
  if (!cleaned) {
    return null;
  }
  return cleaned.slice(0, 1000);
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reports: IReportRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    private readonly reportOpsEmail: ReportOpsEmailService,
  ) {}

  async createReport(
    reporterUserId: string,
    body: CreateUserReportDto,
  ): Promise<UserReportResponseDto> {
    const reportedUserId = await this.resolveReportedUserId(
      reporterUserId,
      body.contextType,
      body.contextId,
    );

    if (reportedUserId === reporterUserId) {
      throw new BadRequestException({ error: 'cannot_report_self' });
    }

    const since = new Date(Date.now() - REPORT_DEBOUNCE_MS);
    const existing = await this.reports.findOpenDuplicateReport({
      reporterUserId,
      reportedUserId,
      reason: body.reason,
      since,
    });
    if (existing) {
      throw new ConflictException({ error: 'report_duplicate' });
    }

    const details = sanitizeReportDetails(body.details);

    const row = await this.reports.createReport({
      reporterUserId,
      reportedUserId,
      reason: body.reason,
      details,
      contextType: body.contextType,
      contextId: body.contextId,
    });

    this.obs.trace(
      `user report created reportId=${row.id} reporterUserId=${reporterUserId} reportedUserId=${reportedUserId} reason=${row.reason} contextType=${row.contextType} contextId=${row.contextId}`,
      ErrorCodes.USER_REPORT_CREATED,
    );

    this.analytics.track(reporterUserId, ProductAnalyticsEvents.USER_REPORTED, {
      reason: row.reason,
    });

    await this.reportOpsEmail.notifyReportCreatedBestEffort(row);

    return toUserReportResponseDto(row);
  }

  private async resolveReportedUserId(
    reporterUserId: string,
    contextType: UserReportContextType,
    contextId: string,
  ): Promise<string> {
    if (contextType === UserReportContextType.MATCH_PROFILE) {
      const profileUserId =
        await this.reports.findProfileUserIdByProfileId(contextId);
      if (!profileUserId) {
        throw new NotFoundException({ error: 'report_context_not_found' });
      }
      return profileUserId;
    }

    if (contextType === UserReportContextType.CONVERSATION) {
      const match =
        await this.reports.findMutualMatchParticipantsById(contextId);
      if (!match || match.status !== MutualMatchStatus.ACTIVE) {
        throw new NotFoundException({ error: 'report_context_not_found' });
      }
      if (
        match.userId1 !== reporterUserId &&
        match.userId2 !== reporterUserId
      ) {
        throw new NotFoundException({ error: 'report_context_not_found' });
      }
      return match.userId1 === reporterUserId ? match.userId2 : match.userId1;
    }

    throw new BadRequestException({ error: 'report_invalid_context' });
  }
}

function toUserReportResponseDto(row: ReportRow): UserReportResponseDto {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    contextType: row.contextType,
    contextId: row.contextId,
  };
}
