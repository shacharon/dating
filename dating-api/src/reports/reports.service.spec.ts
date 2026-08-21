import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  MutualMatchStatus,
  UserReportContextType,
  UserReportReason,
} from '@prisma/client';
import type { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { ReportOpsEmailService } from '../notifications/report-ops-email.service';
import type { IReportRepository } from './repositories/report.repository';
import { ReportsService, sanitizeReportDetails } from './reports.service';

describe('sanitizeReportDetails', () => {
  it('trims, strips null bytes, and normalizes empty details', () => {
    expect(sanitizeReportDetails('  hello\0world  ')).toBe('helloworld');
    expect(sanitizeReportDetails('   ')).toBeNull();
  });
});

describe('ReportsService', () => {
  const reports = {
    findOpenDuplicateReport: jest.fn(),
    createReport: jest.fn(),
    findProfileUserIdByProfileId: jest.fn(),
    findMutualMatchParticipantsById: jest.fn(),
    getReportById: jest.fn(),
    findReportCursor: jest.fn(),
    listReportsByStatus: jest.fn(),
    updateReportStatus: jest.fn(),
  } as unknown as IReportRepository;
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const analytics = { track: jest.fn() } as unknown as AnalyticsService;
  const reportOpsEmail = {
    notifyReportCreatedBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReportOpsEmailService;
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(reports, obs, analytics, reportOpsEmail);
  });

  it('creates a sanitized report for a profile context', async () => {
    (reports.findProfileUserIdByProfileId as jest.Mock).mockResolvedValue(
      'target-user',
    );
    (reports.findOpenDuplicateReport as jest.Mock).mockResolvedValue(null);
    (reports.createReport as jest.Mock).mockResolvedValue({
      id: 'report-1',
      reason: UserReportReason.HARASSMENT,
      status: 'OPEN',
      createdAt: new Date('2026-06-06T12:00:00.000Z'),
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
    expect(reports.createReport).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterUserId: 'reporter-1',
        reportedUserId: 'target-user',
        details: 'details',
      }),
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'reporter-1',
      ProductAnalyticsEvents.USER_REPORTED,
      { reason: UserReportReason.HARASSMENT },
    );
    expect(reportOpsEmail.notifyReportCreatedBestEffort).toHaveBeenCalled();
  });

  it('rejects self-report and missing profile contexts', async () => {
    (reports.findProfileUserIdByProfileId as jest.Mock).mockResolvedValueOnce(
      'same-user',
    );
    await expect(
      service.createReport('same-user', {
        reason: UserReportReason.SPAM,
        contextType: UserReportContextType.MATCH_PROFILE,
        contextId: 'self',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    (reports.findProfileUserIdByProfileId as jest.Mock).mockResolvedValueOnce(
      null,
    );
    await expect(
      service.createReport('reporter-1', {
        reason: UserReportReason.OTHER,
        contextType: UserReportContextType.MATCH_PROFILE,
        contextId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('derives the target from an active participant conversation', async () => {
    (reports.findMutualMatchParticipantsById as jest.Mock).mockResolvedValue({
      userId1: 'reporter-1',
      userId2: 'target-user',
      status: MutualMatchStatus.ACTIVE,
    });
    (reports.findOpenDuplicateReport as jest.Mock).mockResolvedValue(null);
    (reports.createReport as jest.Mock).mockResolvedValue({
      id: 'report-2',
      reason: UserReportReason.SPAM,
      status: 'OPEN',
      createdAt: new Date(),
      contextType: UserReportContextType.CONVERSATION,
      contextId: 'conv-1',
    });
    await service.createReport('reporter-1', {
      reason: UserReportReason.SPAM,
      contextType: UserReportContextType.CONVERSATION,
      contextId: 'conv-1',
    });
    expect(reports.createReport).toHaveBeenCalledWith(
      expect.objectContaining({ reportedUserId: 'target-user' }),
    );
  });

  it('hides inactive and non-participant conversations', async () => {
    (
      reports.findMutualMatchParticipantsById as jest.Mock
    ).mockResolvedValueOnce({
      userId1: 'reporter-1',
      userId2: 'target-user',
      status: MutualMatchStatus.UNMATCHED,
    });
    await expect(
      service.createReport('reporter-1', {
        reason: UserReportReason.OTHER,
        contextType: UserReportContextType.CONVERSATION,
        contextId: 'conv-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('debounces duplicate OPEN reports within 24 hours', async () => {
    (reports.findProfileUserIdByProfileId as jest.Mock).mockResolvedValue(
      'target-user',
    );
    (reports.findOpenDuplicateReport as jest.Mock).mockResolvedValue({
      id: 'existing',
    });
    await expect(
      service.createReport('reporter-1', {
        reason: UserReportReason.HARASSMENT,
        contextType: UserReportContextType.MATCH_PROFILE,
        contextId: 'prof-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(reports.createReport).not.toHaveBeenCalled();
    expect(reports.findOpenDuplicateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterUserId: 'reporter-1',
        reportedUserId: 'target-user',
        reason: UserReportReason.HARASSMENT,
        since: expect.any(Date),
      }),
    );
  });

  it('does not include report details in observability traces', async () => {
    (reports.findProfileUserIdByProfileId as jest.Mock).mockResolvedValue(
      'target-user',
    );
    (reports.findOpenDuplicateReport as jest.Mock).mockResolvedValue(null);
    (reports.createReport as jest.Mock).mockResolvedValue({
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
    expect((obs.trace as jest.Mock).mock.calls[0]?.[0]).not.toContain('secret');
  });
});
