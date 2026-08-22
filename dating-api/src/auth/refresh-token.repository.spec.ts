import { createHash } from 'node:crypto';
import { RefreshTokenRepository } from './refresh-token.repository';
import type { PrismaService } from '../prisma/prisma.service';

describe('RefreshTokenRepository', () => {
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let repo: RefreshTokenRepository;

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    repo = new RefreshTokenRepository(prisma as unknown as PrismaService);
  });

  it('store persists sha256 hash not raw token', async () => {
    const raw = 'raw-refresh-jwt-value';
    const expiresAt = new Date('2038-01-01T00:00:00.000Z');
    await repo.store('user_1', raw, expiresAt);

    const hash = createHash('sha256').update(raw, 'utf8').digest('hex');
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        tokenHash: hash,
        expiresAt,
      },
    });
    expect(JSON.stringify(prisma.refreshToken.create.mock.calls[0])).not.toContain(
      raw,
    );
  });

  it('isActive returns false for revoked row', async () => {
    const raw = 'revoked-refresh';
    const hash = createHash('sha256').update(raw, 'utf8').digest('hex');
    prisma.refreshToken.findUnique.mockResolvedValue({
      tokenHash: hash,
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      revokedAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(repo.isActive(raw)).resolves.toBe(false);
  });

  it('revokeAllForUser updates only active rows for user', async () => {
    await repo.revokeAllForUser('user_9');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_9', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
