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
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
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
});
