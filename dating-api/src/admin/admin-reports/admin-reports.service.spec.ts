import { NotFoundException } from '@nestjs/common';
import {
  UserReportContextType,
  UserReportReason,
  UserReportStatus,
} from '@prisma/client';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import type { AnalyticsService } from '../../analytics/analytics.service';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { IReportRepository } from '../../reports/repositories/report.repository';
import {
  AdminReportsService,
  buildReportContextPath,
} from './admin-reports.service';
import { AdminReportResolutionStatus } from './dto/update-admin-report.dto';

describe('buildReportContextPath', () => {
  it('maps match profile context', () => {
    expect(
      buildReportContextPath(UserReportContextType.MATCH_PROFILE, 'prof_1'),
    ).toBe('/dating/me-matches/prof_1');
  });

  it('maps conversation context', () => {
    expect(
      buildReportContextPath(UserReportContextType.CONVERSATION, 'match_1'),
    ).toBe('/dating/conversations/match_1');
  });
});

describe('AdminReportsService', () => {
  const analytics = { track: jest.fn() } as unknown as AnalyticsService;
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;

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

  let service: AdminReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminReportsService(reports, obs, analytics);
  });

  it('lists OPEN reports without details', async () => {
    reports.listReportsByStatus = jest.fn().mockResolvedValue([
      {
        id: 'report_1',
        reason: UserReportReason.HARASSMENT,
        status: UserReportStatus.OPEN,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        reporterUserId: 'user_a',
        reportedUserId: 'user_b',
        contextType: UserReportContextType.MATCH_PROFILE,
        details: 'secret details',
      },
    ]);

    const res = await service.listReports(UserReportStatus.OPEN, 50);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).not.toHaveProperty('details');
    expect(res.nextCursor).toBeNull();
  });

  it('getReportById returns detail with contextPath', async () => {
    reports.getReportById = jest.fn().mockResolvedValue({
      id: 'report_1',
      reason: UserReportReason.SPAM,
      status: UserReportStatus.OPEN,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      reporterUserId: 'user_a',
      reportedUserId: 'user_b',
      contextType: UserReportContextType.CONVERSATION,
      contextId: 'conv_1',
      details: 'spam messages',
      opsNote: null,
    });

    const res = await service.getReportById('report_1');
    expect(res.contextPath).toBe('/dating/conversations/conv_1');
    expect(res.details).toBe('spam messages');
  });

  it('updateReportStatus rejects non-OPEN report', async () => {
    reports.getReportById = jest.fn().mockResolvedValue({
      id: 'report_1',
      status: UserReportStatus.DISMISSED,
      reportedUserId: 'user_b',
    });

    await expect(
      service.updateReportStatus('admin_1', 'report_1', {
        status: AdminReportResolutionStatus.DISMISSED,
      }),
    ).rejects.toMatchObject({ response: { error: 'report_not_open' } });
  });

  it('updateReportStatus dismisses OPEN report with opsNote', async () => {
    reports.getReportById = jest.fn().mockResolvedValue({
      id: 'report_1',
      status: UserReportStatus.OPEN,
      reportedUserId: 'user_b',
      reason: UserReportReason.OTHER,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      reporterUserId: 'user_a',
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof_1',
      details: null,
      opsNote: null,
    });
    reports.updateReportStatus = jest.fn().mockResolvedValue({
      id: 'report_1',
      reason: UserReportReason.OTHER,
      status: UserReportStatus.DISMISSED,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
      reporterUserId: 'user_a',
      reportedUserId: 'user_b',
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof_1',
      details: null,
      opsNote: 'No violation found',
    });

    const res = await service.updateReportStatus('admin_1', 'report_1', {
      status: AdminReportResolutionStatus.DISMISSED,
      opsNote: 'No violation found',
    });

    expect(res.status).toBe('DISMISSED');
    expect(res.opsNote).toBe('No violation found');
    expect(analytics.track).toHaveBeenCalledWith(
      'admin_1',
      ProductAnalyticsEvents.REPORT_OPS_RESOLVED,
      { status: 'DISMISSED' },
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('event=report_ops_resolved'),
      expect.any(String),
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.not.stringContaining('No violation found'),
      expect.any(String),
    );
  });

  it('updateReportStatus marks action taken and tracks analytics', async () => {
    reports.getReportById = jest.fn().mockResolvedValue({
      id: 'report_1',
      status: UserReportStatus.OPEN,
      reportedUserId: 'user_b',
      reason: UserReportReason.HARASSMENT,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      reporterUserId: 'user_a',
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof_1',
      details: 'harassment text',
      opsNote: null,
    });
    reports.updateReportStatus = jest.fn().mockResolvedValue({
      id: 'report_1',
      reason: UserReportReason.HARASSMENT,
      status: UserReportStatus.ACTION_TAKEN,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
      reporterUserId: 'user_a',
      reportedUserId: 'user_b',
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof_1',
      details: 'harassment text',
      opsNote: null,
    });

    const res = await service.updateReportStatus('admin_1', 'report_1', {
      status: AdminReportResolutionStatus.ACTION_TAKEN,
    });

    expect(res.status).toBe('ACTION_TAKEN');
    expect(analytics.track).toHaveBeenCalledWith(
      'admin_1',
      ProductAnalyticsEvents.REPORT_OPS_RESOLVED,
      { status: 'ACTION_TAKEN' },
    );
  });

  it('getReportById throws when missing', async () => {
    reports.getReportById = jest.fn().mockResolvedValue(null);
    await expect(service.getReportById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
