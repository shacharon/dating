import { UserStatus } from '@prisma/client';
import { PrismaSessionConnectionReadRepository } from './prisma-session-connection-read.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('PrismaSessionConnectionReadRepository', () => {
  const prisma = {
    userSession: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  let repository: PrismaSessionConnectionReadRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaSessionConnectionReadRepository(prisma);
  });

  describe('isSessionRowActive', () => {
    it('returns false when session id is empty', async () => {
      await expect(repository.isSessionRowActive('  ')).resolves.toBe(false);
      expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
    });

    it('returns false when session row is missing', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(repository.isSessionRowActive('sess_1')).resolves.toBe(false);
    });

    it('returns false when session is revoked', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      });
      await expect(repository.isSessionRowActive('sess_1')).resolves.toBe(false);
    });

    it('returns false when session is expired', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await expect(repository.isSessionRowActive('sess_1')).resolves.toBe(false);
    });

    it('returns true for active session', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      });
      await expect(repository.isSessionRowActive('sess_1')).resolves.toBe(true);
    });
  });

  describe('isUserActiveForConnection', () => {
    it('returns false when userId is empty', async () => {
      await expect(repository.isUserActiveForConnection('  ')).resolves.toBe(
        false,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns false when user is soft-deleted', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: UserStatus.ACTIVE,
      });
      await expect(repository.isUserActiveForConnection('user_1')).resolves.toBe(
        false,
      );
    });

    it('returns false when user is disabled', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: null,
        status: UserStatus.DISABLED,
      });
      await expect(repository.isUserActiveForConnection('user_1')).resolves.toBe(
        false,
      );
    });

    it('returns true when user is active', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: null,
        status: UserStatus.ACTIVE,
      });
      await expect(repository.isUserActiveForConnection('user_1')).resolves.toBe(
        true,
      );
    });
  });
});
