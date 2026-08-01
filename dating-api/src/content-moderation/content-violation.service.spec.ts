import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ContentViolationService } from './content-violation.service';

describe('ContentViolationService', () => {
  const prisma = {
    $transaction: jest.fn(),
    userContentViolation: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  let service: ContentViolationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (ops: unknown) => ops,
    );
    service = new ContentViolationService(prisma, obs);
  });

  it('recordViolation creates row and increments count', async () => {
    await service.recordViolation({
      userId: 'user-1',
      surface: 'message',
      flaggedText: 'bad text',
      category: 'sexual',
      score: 0.9,
      action: 'blocked',
    });

    expect(prisma.userContentViolation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        surface: 'message',
        category: 'sexual',
        action: 'blocked',
        conversationId: null,
        recipientUserId: null,
      }),
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { contentViolationCount: { increment: 1 } },
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('content violation recorded'),
      ErrorCodes.CONTENT_VIOLATION_RECORDED,
    );
  });

  it('recordViolation persists conversationId and recipientUserId when provided', async () => {
    await service.recordViolation({
      userId: 'user-1',
      surface: 'message',
      flaggedText: 'bad text',
      category: 'harassment',
      score: 0.95,
      action: 'blocked',
      conversationId: 'mutual_1',
      recipientUserId: 'user-2',
    });

    expect(prisma.userContentViolation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'mutual_1',
        recipientUserId: 'user-2',
      }),
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('conversationId=mutual_1'),
      ErrorCodes.CONTENT_VIOLATION_RECORDED,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('recipientUserId=user-2'),
      ErrorCodes.CONTENT_VIOLATION_RECORDED,
    );
  });

  it('getViolationCount filters by surface and since', async () => {
    (prisma.userContentViolation.count as jest.Mock).mockResolvedValue(2);
    const since = new Date('2026-08-01T00:00:00.000Z');
    const n = await service.getViolationCount('user-1', {
      surface: 'message',
      since,
    });
    expect(n).toBe(2);
    expect(prisma.userContentViolation.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        surface: 'message',
        createdAt: { gte: since },
      },
    });
  });

  it('getViolationCount filters by surfacePrefix', async () => {
    (prisma.userContentViolation.count as jest.Mock).mockResolvedValue(3);
    const n = await service.getViolationCount('user-1', {
      surfacePrefix: 'profile_',
    });
    expect(n).toBe(3);
    expect(prisma.userContentViolation.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        surface: { startsWith: 'profile_' },
      },
    });
  });

  it('getViolationCount prefers exact surface over surfacePrefix', async () => {
    (prisma.userContentViolation.count as jest.Mock).mockResolvedValue(1);
    await service.getViolationCount('user-1', {
      surface: 'profile_aboutMe',
      surfacePrefix: 'profile_',
    });
    expect(prisma.userContentViolation.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        surface: 'profile_aboutMe',
      },
    });
  });

  it('getUserViolationStatus returns defaults when user missing', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const status = await service.getUserViolationStatus('missing');
    expect(status).toEqual({
      status: 'ok',
      mutedUntil: null,
      violationCount: 0,
    });
  });

  describe('enforceViolationThreshold', () => {
    it('returns under_threshold for profile count < 3', async () => {
      (prisma.userContentViolation.count as jest.Mock).mockResolvedValue(2);
      const result = await service.enforceViolationThreshold('user-1', 'profile');
      expect(result).toEqual({
        shouldBlock: false,
        reason: 'under_threshold',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('blocks profile after 3 profile_ violations', async () => {
      (prisma.userContentViolation.count as jest.Mock).mockResolvedValue(3);
      const result = await service.enforceViolationThreshold('user-1', 'profile');
      expect(result).toEqual({
        shouldBlock: true,
        reason: '3_profile_violations',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { contentViolationStatus: 'profile_edit_blocked' },
      });
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('profile_edit_blocked'),
        ErrorCodes.CONTENT_USER_BLOCKED,
      );
    });

    it('mutes message for 1 hour on hourly >= 3', async () => {
      (prisma.userContentViolation.count as jest.Mock)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(3);
      const result = await service.enforceViolationThreshold('user-1', 'message');
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toBe('3_hourly');
      expect(result.muteLabel).toBe('1 hour');
      expect(result.mutedUntil).toEqual(expect.any(Date));
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          contentViolationStatus: 'messaging_muted',
          contentViolationMutedUntil: expect.any(Date),
        },
      });
    });

    it('mutes message for 24 hours on daily >= 10', async () => {
      (prisma.userContentViolation.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);
      const result = await service.enforceViolationThreshold('user-1', 'message');
      expect(result.reason).toBe('10_daily');
      expect(result.muteLabel).toBe('24 hours');
    });

    it('mutes message indefinitely on lifetime >= 20', async () => {
      (prisma.userContentViolation.count as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(20);
      const result = await service.enforceViolationThreshold('user-1', 'message');
      expect(result).toMatchObject({
        shouldBlock: true,
        reason: '20_lifetime',
        muteLabel: 'indefinitely',
        mutedUntil: null,
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          contentViolationStatus: 'messaging_muted',
          contentViolationMutedUntil: null,
        },
      });
    });

    it('returns under_threshold for message below all ladders', async () => {
      (prisma.userContentViolation.count as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);
      const result = await service.enforceViolationThreshold('user-1', 'message');
      expect(result).toEqual({
        shouldBlock: false,
        reason: 'under_threshold',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('isUserBlocked', () => {
    it('returns true for profile_edit_blocked', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        contentViolationStatus: 'profile_edit_blocked',
        contentViolationMutedUntil: null,
        contentViolationCount: 3,
      });
      await expect(service.isUserBlocked('user-1', 'profile')).resolves.toBe(
        true,
      );
      await expect(service.isUserBlocked('user-1', 'message')).resolves.toBe(
        false,
      );
    });

    it('returns true for active messaging mute', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: new Date(Date.now() + 60_000),
        contentViolationCount: 3,
      });
      await expect(service.isUserBlocked('user-1', 'message')).resolves.toBe(
        true,
      );
    });

    it('clears expired messaging mute and returns false', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: new Date(Date.now() - 60_000),
        contentViolationCount: 3,
      });
      await expect(service.isUserBlocked('user-1', 'message')).resolves.toBe(
        false,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          contentViolationStatus: 'ok',
          contentViolationMutedUntil: null,
        },
      });
    });
  });

  it('clearExpiredMutes updates temporary expired mutes', async () => {
    (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    const n = await service.clearExpiredMutes();
    expect(n).toBe(2);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: {
          not: null,
          lte: expect.any(Date),
        },
      },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('cleared 2 expired mutes'),
      ErrorCodes.CONTENT_MUTES_EXPIRED,
    );
  });

  it('clearExpiredMutes where excludes indefinite mutes (mutedUntil null)', async () => {
    (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await service.clearExpiredMutes();
    const arg = (prisma.user.updateMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.contentViolationMutedUntil).toEqual(
      expect.objectContaining({ not: null }),
    );
  });

  it('getViolationStats aggregates counts', async () => {
    (prisma.userContentViolation.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { category: 'sexual', _count: { _all: 2 } },
        { category: 'hate', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { surface: 'message', _count: { _all: 2 } },
        { surface: 'profile_aboutMe', _count: { _all: 1 } },
      ]);
    (prisma.userContentViolation.count as jest.Mock).mockResolvedValue(3);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { contentViolationMutedUntil: new Date() },
      { contentViolationMutedUntil: null },
    ]);

    const stats = await service.getViolationStats();
    expect(stats).toEqual({
      totalViolations: 3,
      violationsByCategory: { sexual: 2, hate: 1 },
      violationsBySurface: { message: 2, profile_aboutMe: 1 },
      blockedProfileUsers: 1,
      mutedMessageUsers: 2,
      mutedMessageUsersTemporary: 1,
      mutedMessageUsersIndefinite: 1,
    });
  });
});
