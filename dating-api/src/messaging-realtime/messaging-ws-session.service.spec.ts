import { UserStatus } from '@prisma/client';
import { MessagingWsSessionService } from './messaging-ws-session.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TokenService } from '../auth/token.service';

describe('MessagingWsSessionService', () => {
  const prisma = {
    userSession: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const tokens = {
    verifyAccessToken: jest.fn(),
  } as unknown as TokenService;

  let service: MessagingWsSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingWsSessionService(prisma, tokens);
  });

  describe('isSessionActive', () => {
    it('returns false when session id is empty', async () => {
      await expect(service.isSessionActive('  ')).resolves.toBe(false);
      expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
    });

    it('returns false when session row is missing', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.isSessionActive('sess_1')).resolves.toBe(false);
    });

    it('returns false when session is revoked', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      });
      await expect(service.isSessionActive('sess_1')).resolves.toBe(false);
    });

    it('returns false when session is expired', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await expect(service.isSessionActive('sess_1')).resolves.toBe(false);
    });

    it('returns true for active session', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      });
      await expect(service.isSessionActive('sess_1')).resolves.toBe(true);
    });
  });

  describe('isConnectionAllowed', () => {
    beforeEach(() => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      });
    });

    it('returns false when session is revoked', async () => {
      (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      });
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(false);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns false when userId is empty', async () => {
      await expect(service.isConnectionAllowed('sess_1', '  ')).resolves.toBe(
        false,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns false when user is soft-deleted', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: UserStatus.ACTIVE,
      });
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(false);
    });

    it('returns false when user is disabled', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: null,
        status: UserStatus.DISABLED,
      });
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(false);
    });

    it('returns true when session and user are allowed', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: null,
        status: UserStatus.ACTIVE,
      });
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(true);
    });
  });

  describe('isBearerConnectionAllowed', () => {
    it('returns false when token verify fails', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue(null);
      await expect(
        service.isBearerConnectionAllowed('user_1', 'bad-token'),
      ).resolves.toBe(false);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns false when token userId mismatches', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
        userId: 'other_user',
      });
      await expect(
        service.isBearerConnectionAllowed('user_1', 'token'),
      ).resolves.toBe(false);
    });

    it('returns false when user is disabled', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
        userId: 'user_1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: null,
        status: UserStatus.DISABLED,
      });
      await expect(
        service.isBearerConnectionAllowed('user_1', 'token'),
      ).resolves.toBe(false);
    });

    it('returns true when token and user are valid', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
        userId: 'user_1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        deletedAt: null,
        status: UserStatus.ACTIVE,
      });
      await expect(
        service.isBearerConnectionAllowed('user_1', 'token'),
      ).resolves.toBe(true);
    });
  });
});
