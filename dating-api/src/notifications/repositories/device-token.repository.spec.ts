import {
  MAX_DEVICE_TOKENS_PER_USER,
  PrismaDeviceTokenRepository,
} from './device-token.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('PrismaDeviceTokenRepository', () => {
  const tx = {
    deviceToken: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
    deviceToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let repo: PrismaDeviceTokenRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaDeviceTokenRepository(prisma);
  });

  it('upserts by unique token inside a transaction', async () => {
    tx.deviceToken.upsert.mockResolvedValue({});
    tx.deviceToken.findMany.mockResolvedValue([{ id: 'dt1' }]);

    await repo.upsert('user-1', 'fcm-token', 'android');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.deviceToken.upsert).toHaveBeenCalledWith({
      where: { token: 'fcm-token' },
      create: { userId: 'user-1', token: 'fcm-token', platform: 'android' },
      update: { userId: 'user-1', platform: 'android' },
    });
    expect(tx.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it('drops oldest tokens when user exceeds cap', async () => {
    tx.deviceToken.upsert.mockResolvedValue({});
    const owned = Array.from({ length: MAX_DEVICE_TOKENS_PER_USER + 2 }, (_, i) => ({
      id: `dt${i}`,
    }));
    tx.deviceToken.findMany.mockResolvedValue(owned);
    tx.deviceToken.deleteMany.mockResolvedValue({ count: 2 });

    await repo.upsert('user-1', 'newest', 'android');

    expect(tx.deviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { updatedAt: 'asc' },
      select: { id: true },
    });
    expect(tx.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['dt0', 'dt1'] } },
    });
  });

  it('finds tokens by userId', async () => {
    (prisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
      { token: 'a', platform: 'android' },
    ]);

    const rows = await repo.findByUserId('user-1');

    expect(rows).toEqual([{ token: 'a', platform: 'android' }]);
    expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { token: true, platform: true },
    });
  });

  it('deletes owner-scoped only', async () => {
    (prisma.deviceToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const count = await repo.deleteForUser('user-1', 'fcm-token');

    expect(count).toBe(1);
    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', token: 'fcm-token' },
    });
  });
});
