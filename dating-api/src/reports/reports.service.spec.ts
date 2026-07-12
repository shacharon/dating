import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  UserReportContextType,
  UserReportReason,
  MutualMatchStatus,
} from '@prisma/client';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { ReportOpsEmailService } from '../notifications/report-ops-email.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ReportsService, sanitizeReportDetails } from './reports.service';

describe('sanitizeReportDetails', () => {
  it('trims and strips null bytes', () => {
    expect(sanitizeReportDetails('  hello\0world  ')).toBe('helloworld');
  });

  it('returns null for empty after trim', () => {
    expect(sanitizeReportDetails('   ')).toBeNull();
  });
});

describe('ReportsService', () => {
  const prisma = {
    userProfile: { findUnique: jest.fn() },
    mutualMatch: { findUnique: jest.fn() },
    userReport: { findFirst: jest.fn(), create: jest.fn() },
  } as unknown as PrismaService;

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const analytics = { track: jest.fn() } as unknown as AnalyticsService;
  const reportOpsEmail = {
    notifyReportCreatedBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReportOpsEmailService;

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prisma, obs, analytics, reportOpsEmail);
  });

  it('creates report for MATCH_PROFILE context', async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      userId: 'target-user',
    });
    (prisma.userReport.findFirst as jest.Mock).mockResolvedValue(null);
    const createdAt = new Date('2026-06-06T12:00:00.000Z');
    (prisma.userReport.create as jest.Mock).mockResolvedValue({
      id: 'report-1',
      reason: UserReportReason.HARASSMENT,
      status: 'OPEN',
      createdAt,
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof-1',
    });

    const result = await service.createReport('reporter-1', {
      reason: UserReportReason.HARASSMENT,
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof-1',
      details: '  details  ',
    });

    expect(result.id).toBe('report-1');
    expect(prisma.userReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reporterUserId: 'reporter-1',
        reportedUserId: 'target-user',
        details: 'details',
      }),
    });
    expect(analytics.track).toHaveBeenCalledWith(
      'reporter-1',
      ProductAnalyticsEvents.USER_REPORTED,
      { reason: UserReportReason.HARASSMENT },
    );
    const traceMessage = (obs.trace as jest.Mock).mock.calls[0]?.[0] as string;
    expect(traceMessage).not.toContain('details');
    expect(traceMessage).not.toContain('secret');
  });

  it('does not include details text in observability trace', async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      userId: 'target-user',
    });
    (prisma.userReport.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.userReport.create as jest.Mock).mockResolvedValue({
      id: 'report-3',
      reason: UserReportReason.OTHER,
      status: 'OPEN',
      createdAt: new Date(),
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof-1',
    });

    await service.createReport('reporter-1', {
      reason: UserReportReason.OTHER,
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof-1',
      details: 'secret complaint text',
    });

    const traceMessage = (obs.trace as jest.Mock).mock.calls[0]?.[0] as string;
    expect(traceMessage).not.toContain('secret complaint text');
  });

  it('rejects self-report', async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      userId: 'same-user',
    });

    await expect(
      service.createReport('same-user', {
        reason: UserReportReason.SPAM,
        contextType: UserReportContextType.MATCH_PROFILE,
        contextId: 'prof-self',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when match profile context is missing', async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createReport('reporter-1', {
        reason: UserReportReason.OTHER,
        contextType: UserReportContextType.MATCH_PROFILE,
        contextId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('derives reported user from CONVERSATION context', async () => {
    (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
      userId1: 'reporter-1',
      userId2: 'target-user',
      status: MutualMatchStatus.ACTIVE,
    });
    (prisma.userReport.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.userReport.create as jest.Mock).mockResolvedValue({
      id: 'report-2',
      reason: UserReportReason.INAPPROPRIATE_CONTENT,
      status: 'OPEN',
      createdAt: new Date(),
      contextType: UserReportContextType.CONVERSATION,
      contextId: 'conv-1',
    });

    await service.createReport('reporter-1', {
      reason: UserReportReason.INAPPROPRIATE_CONTENT,
      contextType: UserReportContextType.CONVERSATION,
      contextId: 'conv-1',
    });

    expect(prisma.userReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reportedUserId: 'target-user' }),
    });
  });

  it('debounces duplicate OPEN report within 24h', async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      userId: 'target-user',
    });
    (prisma.userReport.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing',
    });

    await expect(
      service.createReport('reporter-1', {
        reason: UserReportReason.HARASSMENT,
        contextType: UserReportContextType.MATCH_PROFILE,
        contextId: 'prof-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userReport.create).not.toHaveBeenCalled();
  });
});
