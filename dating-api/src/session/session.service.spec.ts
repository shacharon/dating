import { Test, TestingModule } from '@nestjs/testing';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { hashSessionToken } from './session-token.crypto';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: {
    userSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  const pepper = 'unit-test-pepper';
  const authSessionConfigStub = {
    sessionSecretPepper: pepper,
    sessionTtlDays: 14,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuthSessionConfigService,
          useValue: authSessionConfigStub,
        },
      ],
    }).compile();
    service = module.get(SessionService);
  });

  describe('createSession', () => {
    it('persists only sessionTokenHash, never raw token', async () => {
      const future = new Date('2035-01-01T00:00:00.000Z');
      prisma.userSession.create.mockResolvedValue({
        id: 'sess_1',
        expiresAt: future,
      });

      const out = await service.createSession('user_1', {
        ip: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
      const arg = prisma.userSession.create.mock.calls[0][0];
      expect(arg.data).toEqual(
        expect.objectContaining({
          userId: 'user_1',
          ip: '127.0.0.1',
          userAgent: 'jest',
        }),
      );
      expect(arg.data.sessionTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(arg.data.sessionTokenHash).toBe(
        hashSessionToken(out.rawToken, pepper),
      );
      expect(JSON.stringify(arg.data)).not.toContain(out.rawToken);
      expect(out.sessionId).toBe('sess_1');
      expect(out.expiresAt).toEqual(future);
    });

    it('throws when pepper is not configured', async () => {
      const mod = await Test.createTestingModule({
        providers: [
          SessionService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: AuthSessionConfigService,
            useValue: { ...authSessionConfigStub, sessionSecretPepper: undefined },
          },
        ],
      }).compile();
      const bare = mod.get(SessionService);
      await expect(bare.createSession('u')).rejects.toThrow(
        /SESSION_SECRET_PEPPER/,
      );
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });
  });

  describe('validateSessionToken', () => {
    const raw = 'opaque-token';
    const sessionTokenHash = hashSessionToken(raw, pepper);

    it('returns null when session row is missing', async () => {
      prisma.userSession.findUnique.mockResolvedValue(null);
      await expect(service.validateSessionToken(raw)).resolves.toBeNull();
    });

    it('returns null when session is revoked', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        sessionTokenHash,
        expiresAt: new Date('2035-01-01T00:00:00.000Z'),
        revokedAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      await expect(service.validateSessionToken(raw)).resolves.toBeNull();
      expect(prisma.userSession.update).not.toHaveBeenCalled();
    });

    it('returns null when session is expired', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        sessionTokenHash,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      await expect(service.validateSessionToken(raw)).resolves.toBeNull();
    });

    it('returns null when raw token is blank', async () => {
      await expect(service.validateSessionToken('')).resolves.toBeNull();
      await expect(service.validateSessionToken('   ')).resolves.toBeNull();
      await expect(service.validateSessionToken(null)).resolves.toBeNull();
      expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when pepper is not configured', async () => {
      const mod = await Test.createTestingModule({
        providers: [
          SessionService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: AuthSessionConfigService,
            useValue: { ...authSessionConfigStub, sessionSecretPepper: undefined },
          },
        ],
      }).compile();
      const bare = mod.get(SessionService);
      await expect(bare.validateSessionToken(raw)).resolves.toBeNull();
      expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when expiresAt equals now (boundary)', async () => {
      const t = new Date();
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        sessionTokenHash,
        expiresAt: t,
        revokedAt: null,
      });
      jest.useFakeTimers();
      jest.setSystemTime(t);
      await expect(service.validateSessionToken(raw)).resolves.toBeNull();
      jest.useRealTimers();
    });

    it('returns session and updates lastSeenAt when valid', async () => {
      const exp = new Date('2035-06-01T12:00:00.000Z');
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        sessionTokenHash,
        expiresAt: exp,
        revokedAt: null,
      });
      prisma.userSession.update.mockResolvedValue({});

      await expect(service.validateSessionToken(raw)).resolves.toEqual({
        sessionId: 's1',
        userId: 'u1',
        expiresAt: exp,
      });
      expect(prisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('revokeSession', () => {
    const raw = 'revoke-me';
    const sessionTokenHash = hashSessionToken(raw, pepper);

    it('revokes by rawToken and targets hash + active row only', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      const ok = await service.revokeSession({ rawToken: raw });
      expect(ok).toBe(true);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { sessionTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('returns false for blank rawToken', async () => {
      await expect(service.revokeSession({ rawToken: '  ' })).resolves.toBe(
        false,
      );
      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    });

    it('returns false when pepper is missing for rawToken path', async () => {
      const mod = await Test.createTestingModule({
        providers: [
          SessionService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: AuthSessionConfigService,
            useValue: { ...authSessionConfigStub, sessionSecretPepper: undefined },
          },
        ],
      }).compile();
      const bare = mod.get(SessionService);
      await expect(bare.revokeSession({ rawToken: raw })).resolves.toBe(false);
      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    });

    it('revokes by sessionId', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      const ok = await service.revokeSession({ sessionId: 'sess-id-1' });
      expect(ok).toBe(true);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'sess-id-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('returns false for blank sessionId', async () => {
      await expect(service.revokeSession({ sessionId: '  ' })).resolves.toBe(
        false,
      );
      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    });
  });
});
