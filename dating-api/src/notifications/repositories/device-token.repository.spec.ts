import { PrismaDeviceTokenRepository } from './device-token.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('PrismaDeviceTokenRepository', () => {
  const prisma = {
    deviceToken: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let repo: PrismaDeviceTokenRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaDeviceTokenRepository(prisma);
  });

  it('upserts by unique token', async () => {
    (prisma.deviceToken.upsert as jest.Mock).mockResolvedValue({});

    await repo.upsert('user-1', 'fcm-token', 'android');

    expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
      where: { token: 'fcm-token' },
      create: { userId: 'user-1', token: 'fcm-token', platform: 'android' },
      update: { userId: 'user-1', platform: 'android' },
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
