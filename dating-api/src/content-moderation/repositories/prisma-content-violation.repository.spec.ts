import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaContentViolationRepository } from './prisma-content-violation.repository';

describe('PrismaContentViolationRepository', () => {
  const userContentViolation = { create: jest.fn() };
  const user = {
    update: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  };
  const prisma = {
    userContentViolation,
    user,
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  let repo: PrismaContentViolationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    repo = new PrismaContentViolationRepository(prisma);
  });

  it('createViolationAndIncrementCount runs create + count increment in one $transaction', async () => {
    const data = {
      userId: 'u1',
      surface: 'message',
      flaggedText: 'x',
      category: 'harassment',
      score: 0.9,
      action: 'flagged',
      conversationId: 'c1',
      recipientUserId: 'u2',
    };

    await repo.createViolationAndIncrementCount(data);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toHaveLength(2);
    expect(userContentViolation.create).toHaveBeenCalledWith({ data });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { contentViolationCount: { increment: 1 } },
    });
  });

  it('setMessagingMute writes status + mutedUntil', async () => {
    user.update.mockResolvedValue({});
    const until = new Date('2026-01-02T00:00:00.000Z');

    await repo.setMessagingMute('u1', until);

    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: until,
      },
    });
  });

  it('resetViolationStatus clears mute fields', async () => {
    user.update.mockResolvedValue({});

    await repo.resetViolationStatus('u1');

    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
  });
});
