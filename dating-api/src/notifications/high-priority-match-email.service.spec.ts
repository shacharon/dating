import { MatchActionType } from '@prisma/client';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { HighPriorityMatchEmailService } from './high-priority-match-email.service';
import { HIGH_PRIORITY_MATCH_EMAIL_SUBJECT } from './high-priority-match-email.helpers';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsService } from '../analytics/analytics.service';

describe('HighPriorityMatchEmailService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    highPriorityMatchEmailLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    matchAction: { findMany: jest.fn() },
    userProfile: { findUnique: jest.fn() },
    matchNarrativeCache: { findFirst: jest.fn() },
    conversationStarterCache: { findFirst: jest.fn() },
  } as unknown as PrismaService;

  const config = {
    appPublicUrl: 'http://localhost:3000',
  } as EmailNotificationConfigService;

  const email = {
    sendTransactionalBestEffort: jest.fn(),
  } as unknown as EmailNotificationService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  const analytics = {
    track: jest.fn(),
  } as unknown as AnalyticsService;

  let service: HighPriorityMatchEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HighPriorityMatchEmailService(
      prisma,
      config,
      email,
      obs,
      analytics,
    );
    (prisma.matchAction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.highPriorityMatchEmailLog.findMany as jest.Mock).mockResolvedValue(
      [],
    );
    (prisma.highPriorityMatchEmailLog.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    (prisma.matchNarrativeCache.findFirst as jest.Mock).mockResolvedValue(null);
    (
      prisma.conversationStarterCache.findFirst as jest.Mock
    ).mockResolvedValue(null);
  });

  it('sends email for newly HIGH candidate and logs', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'viewer',
      email: 'v@example.com',
      emailNotificationsEnabled: true,
      highPriorityMatchEmailsEnabled: true,
      profile: { id: 'vp' },
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'cand',
      nickname: 'Sarah',
      name: null,
      birthDate: new Date('1994-01-15T00:00:00.000Z'),
    });
    (email.sendTransactionalBestEffort as jest.Mock).mockResolvedValue('sent');

    await service.notifyAfterRebuildBestEffort({
      viewerUserId: 'viewer',
      priorRows: [],
      newRows: [
        { candidateProfileId: 'cand', matchScore: 92, hardBlocked: false },
      ],
    });

    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'v@example.com',
        subject: HIGH_PRIORITY_MATCH_EMAIL_SUBJECT,
        okCode: ErrorCodes.EMAIL_HIGH_PRIORITY_MATCH_SEND_OK,
      }),
    );
    expect(prisma.highPriorityMatchEmailLog.create).toHaveBeenCalledWith({
      data: {
        viewerUserId: 'viewer',
        candidateProfileId: 'cand',
        matchScore: 92,
      },
    });
    expect(analytics.track).toHaveBeenCalledWith(
      'viewer',
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SENT,
      expect.objectContaining({ candidateProfileId: 'cand', matchScore: 92 }),
    );
  });

  it('respects frequency limit (1 per 24h)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'viewer',
      email: 'v@example.com',
      emailNotificationsEnabled: true,
      highPriorityMatchEmailsEnabled: true,
      profile: { id: 'vp' },
    });
    (prisma.highPriorityMatchEmailLog.findFirst as jest.Mock).mockResolvedValue({
      id: 'recent',
    });

    await service.notifyAfterRebuildBestEffort({
      viewerUserId: 'viewer',
      priorRows: [],
      newRows: [
        { candidateProfileId: 'cand', matchScore: 92, hardBlocked: false },
      ],
    });

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith(
      'viewer',
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SKIPPED,
      { reason: 'frequency' },
    );
  });

  it('respects highPriorityMatchEmailsEnabled off', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'viewer',
      email: 'v@example.com',
      emailNotificationsEnabled: true,
      highPriorityMatchEmailsEnabled: false,
      profile: { id: 'vp' },
    });

    await service.notifyAfterRebuildBestEffort({
      viewerUserId: 'viewer',
      priorRows: [],
      newRows: [
        { candidateProfileId: 'cand', matchScore: 92, hardBlocked: false },
      ],
    });

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith(
      'viewer',
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SKIPPED,
      { reason: 'prefs_off' },
    );
  });

  it('respects global emailNotificationsEnabled off', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'viewer',
      email: 'v@example.com',
      emailNotificationsEnabled: false,
      highPriorityMatchEmailsEnabled: true,
      profile: { id: 'vp' },
    });

    await service.notifyAfterRebuildBestEffort({
      viewerUserId: 'viewer',
      priorRows: [],
      newRows: [
        { candidateProfileId: 'cand', matchScore: 92, hardBlocked: false },
      ],
    });

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith(
      'viewer',
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SKIPPED,
      { reason: 'global_email_off' },
    );
  });

  it('does not log when send returns failed', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'viewer',
      email: 'v@example.com',
      emailNotificationsEnabled: true,
      highPriorityMatchEmailsEnabled: true,
      profile: { id: 'vp' },
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'cand',
      nickname: 'Sarah',
      name: null,
      birthDate: null,
    });
    (email.sendTransactionalBestEffort as jest.Mock).mockResolvedValue(
      'failed',
    );

    await service.notifyAfterRebuildBestEffort({
      viewerUserId: 'viewer',
      priorRows: [],
      newRows: [
        { candidateProfileId: 'cand', matchScore: 92, hardBlocked: false },
      ],
    });

    expect(prisma.highPriorityMatchEmailLog.create).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalledWith(
      'viewer',
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SENT,
      expect.anything(),
    );
  });

  it('excludes PASS targets', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'viewer',
      email: 'v@example.com',
      emailNotificationsEnabled: true,
      highPriorityMatchEmailsEnabled: true,
      profile: { id: 'vp' },
    });
    (prisma.matchAction.findMany as jest.Mock).mockResolvedValue([
      {
        targetProfileIdSnapshot: 'cand',
        action: MatchActionType.PASS,
      },
    ]);

    await service.notifyAfterRebuildBestEffort({
      viewerUserId: 'viewer',
      priorRows: [],
      newRows: [
        { candidateProfileId: 'cand', matchScore: 92, hardBlocked: false },
      ],
    });

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
  });

  it('does not throw when inner path fails', async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    await expect(
      service.notifyAfterRebuildBestEffort({
        viewerUserId: 'viewer',
        priorRows: [],
        newRows: [],
      }),
    ).resolves.toBeUndefined();
    expect(obs.error).toHaveBeenCalled();
  });
});
