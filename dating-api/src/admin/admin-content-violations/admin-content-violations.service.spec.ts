import { NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { ContentViolationService } from '../../content-moderation/content-violation.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminContentViolationsService } from './admin-content-violations.service';

describe('AdminContentViolationsService', () => {
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const violations = {
    getViolationStats: jest.fn(),
  } as unknown as ContentViolationService;

  const prisma = {
    userContentViolation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: AdminContentViolationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminContentViolationsService(prisma, violations, obs);
  });

  it('lists violations with filters and truncates preview', async () => {
    const longText = 'x'.repeat(150);
    prisma.userContentViolation.findMany = jest.fn().mockResolvedValue([
      {
        id: 'vio_1',
        userId: 'user_1',
        surface: 'message',
        category: 'sexual',
        flaggedText: longText,
        score: 0.9,
        action: 'blocked',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        conversationId: 'mutual_1',
        recipientUserId: 'user_2',
        user: {
          email: 'a@example.com',
          contentViolationStatus: 'messaging_muted',
          contentViolationMutedUntil: new Date('2026-08-01T12:00:00.000Z'),
          profile: { nickname: 'Alice' },
        },
        recipient: {
          email: 'b@example.com',
          profile: { nickname: 'Bob' },
        },
      },
    ]);
    prisma.userContentViolation.count = jest.fn().mockResolvedValue(1);

    const res = await service.listViolations({
      surface: 'message',
      category: 'sexual',
      userId: 'user_1',
      limit: 10,
      offset: 0,
    });

    expect(prisma.userContentViolation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          surface: 'message',
          category: 'sexual',
          userId: 'user_1',
        },
        take: 10,
        skip: 0,
      }),
    );
    expect(res.total).toBe(1);
    expect(res.violations[0].flaggedTextPreview).toHaveLength(100);
    expect(res.violations[0]).not.toHaveProperty('flaggedText');
    expect(res.violations[0].userStatus).toBe('messaging_muted');
    expect(res.violations[0].userNickname).toBe('Alice');
    expect(res.violations[0].userMutedUntil).toBe(
      '2026-08-01T12:00:00.000Z',
    );
    expect(res.violations[0].conversationId).toBe('mutual_1');
    expect(res.violations[0].recipientUserId).toBe('user_2');
    expect(res.violations[0].recipientEmail).toBe('b@example.com');
    expect(res.violations[0].recipientNickname).toBe('Bob');
  });

  it('lists profile violations with null recipient context', async () => {
    prisma.userContentViolation.findMany = jest.fn().mockResolvedValue([
      {
        id: 'vio_p',
        userId: 'user_1',
        surface: 'profile_aboutMe',
        category: 'hate',
        flaggedText: 'bad',
        score: 0.7,
        action: 'blocked',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        conversationId: null,
        recipientUserId: null,
        user: {
          email: 'a@example.com',
          contentViolationStatus: 'ok',
          contentViolationMutedUntil: null,
          profile: { nickname: 'Alice' },
        },
        recipient: null,
      },
    ]);
    prisma.userContentViolation.count = jest.fn().mockResolvedValue(1);

    const res = await service.listViolations({});
    expect(res.violations[0]).toMatchObject({
      conversationId: null,
      recipientUserId: null,
      recipientEmail: null,
      recipientNickname: null,
    });
  });

  it('filters violations by action', async () => {
    prisma.userContentViolation.findMany = jest.fn().mockResolvedValue([]);
    prisma.userContentViolation.count = jest.fn().mockResolvedValue(0);

    await service.listViolations({ action: 'blocked' });

    expect(prisma.userContentViolation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: 'blocked' },
      }),
    );
  });

  it('includes flaggedText on list when includeFullText is true', async () => {
    prisma.userContentViolation.findMany = jest.fn().mockResolvedValue([
      {
        id: 'vio_1',
        userId: 'user_1',
        surface: 'message',
        category: 'hate',
        flaggedText: 'full phrase here',
        score: 0.9,
        action: 'blocked',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        conversationId: null,
        recipientUserId: null,
        user: {
          email: 'a@example.com',
          contentViolationStatus: 'ok',
          contentViolationMutedUntil: null,
          profile: null,
        },
        recipient: null,
      },
    ]);
    prisma.userContentViolation.count = jest.fn().mockResolvedValue(1);

    const res = await service.listViolations({ includeFullText: true });
    expect(res.violations[0].flaggedText).toBe('full phrase here');
    expect(res.violations[0].flaggedTextPreview).toBe('full phrase here');
  });

  it('listBlockedUsers returns muted users with full latest phrase', async () => {
    prisma.user.findMany = jest.fn().mockResolvedValue([
      {
        id: 'user_1',
        email: 'a@example.com',
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: new Date('2026-08-01T12:00:00.000Z'),
        contentViolationCount: 4,
        profile: { nickname: 'Alice' },
        contentViolations: [
          {
            id: 'vio_1',
            surface: 'message',
            category: 'harassment',
            flaggedText: 'I will hurt you badly',
            score: 0.99,
            action: 'blocked',
            createdAt: new Date('2026-08-01T11:00:00.000Z'),
            conversationId: 'mutual_1',
            recipientUserId: 'user_2',
            recipient: {
              email: 'b@example.com',
              profile: { nickname: 'Bob' },
            },
          },
        ],
      },
    ]);
    prisma.user.count = jest.fn().mockResolvedValue(1);

    const res = await service.listBlockedUsers({ limit: 50, offset: 0 });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contentViolationStatus: {
            in: ['profile_edit_blocked', 'messaging_muted'],
          },
        },
      }),
    );
    expect(res.total).toBe(1);
    expect(res.users[0]).toMatchObject({
      userId: 'user_1',
      userStatus: 'messaging_muted',
      violationCount: 4,
      latestViolation: expect.objectContaining({
        flaggedText: 'I will hurt you badly',
        flaggedTextPreview: 'I will hurt you badly',
        recipientEmail: 'b@example.com',
        recipientNickname: 'Bob',
        conversationId: 'mutual_1',
      }),
    });
  });

  it('listBlockedUsers allows null latestViolation', async () => {
    prisma.user.findMany = jest.fn().mockResolvedValue([
      {
        id: 'user_1',
        email: 'a@example.com',
        contentViolationStatus: 'profile_edit_blocked',
        contentViolationMutedUntil: null,
        contentViolationCount: 3,
        profile: null,
        contentViolations: [],
      },
    ]);
    prisma.user.count = jest.fn().mockResolvedValue(1);

    const res = await service.listBlockedUsers({});
    expect(res.users[0].latestViolation).toBeNull();
  });

  it('getStats delegates to ContentViolationService', async () => {
    const stats = {
      totalViolations: 3,
      violationsByCategory: { sexual: 3 },
      violationsBySurface: { message: 3 },
      blockedProfileUsers: 0,
      mutedMessageUsers: 1,
      mutedMessageUsersTemporary: 1,
      mutedMessageUsersIndefinite: 0,
    };
    (violations.getViolationStats as jest.Mock).mockResolvedValue(stats);

    await expect(service.getStats()).resolves.toEqual(stats);
    expect(violations.getViolationStats).toHaveBeenCalled();
  });

  it('unblockUser clears status and logs', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      contentViolationStatus: 'messaging_muted',
    });
    prisma.user.update = jest.fn().mockResolvedValue({});

    const res = await service.unblockUser(
      'admin_1',
      'user_1',
      'False positive',
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
    expect(res).toMatchObject({
      success: true,
      userId: 'user_1',
      previousStatus: 'messaging_muted',
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('admin content unblock userId=user_1'),
      ErrorCodes.ADMIN_CONTENT_UNBLOCK,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('reason=False positive'),
      ErrorCodes.ADMIN_CONTENT_UNBLOCK,
    );
  });

  it('unblockUser is idempotent when already ok', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      contentViolationStatus: 'ok',
    });
    prisma.user.update = jest.fn().mockResolvedValue({});

    const res = await service.unblockUser('admin_1', 'user_1', 'cleanup');
    expect(res.previousStatus).toBe('ok');
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('unblockUser throws NotFound when user missing', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.unblockUser('admin_1', 'missing', 'note'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
