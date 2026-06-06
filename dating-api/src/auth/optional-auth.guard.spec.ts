import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedRequest } from './auth-request.types';
import { OptionalAuthGuard } from './optional-auth.guard';

function mockContext(req: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as ExecutionContext;
}

describe('OptionalAuthGuard', () => {
  let guard: OptionalAuthGuard;
  let sessions: { validateSessionToken: jest.Mock };
  let users: { findById: jest.Mock };
  const cookieName = 'dating_session';

  beforeEach(async () => {
    sessions = { validateSessionToken: jest.fn() };
    users = { findById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionalAuthGuard,
        { provide: SessionService, useValue: sessions },
        { provide: UsersService, useValue: users },
        {
          provide: AuthSessionConfigService,
          useValue: { sessionCookieName: cookieName },
        },
      ],
    }).compile();
    guard = module.get(OptionalAuthGuard);
  });

  it('returns true without setting authUser when there is no session cookie', async () => {
    const req = { headers: {} } as AuthenticatedRequest;
    sessions.validateSessionToken.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toBeUndefined();
    expect(req.authSession).toBeUndefined();
  });

  it('returns true without authUser when session is invalid (validate returns null)', async () => {
    const req = {
      headers: { cookie: `${cookieName}=dead` },
    } as unknown as AuthenticatedRequest;
    sessions.validateSessionToken.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toBeUndefined();
  });

  it('returns true without authUser when user is missing', async () => {
    const req = { cookies: { [cookieName]: 'tok' } } as unknown as AuthenticatedRequest;
    sessions.validateSessionToken.mockResolvedValue({
      sessionId: 's1',
      userId: 'u1',
      expiresAt: new Date('2038-01-01'),
    });
    users.findById.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toBeUndefined();
  });

  it('returns true without authUser when user is not ACTIVE', async () => {
    const req = { cookies: { [cookieName]: 'tok' } } as unknown as AuthenticatedRequest;
    sessions.validateSessionToken.mockResolvedValue({
      sessionId: 's1',
      userId: 'u1',
      expiresAt: new Date('2038-01-01'),
    });
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.DISABLED,
    });

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toBeUndefined();
  });

  it('returns true without authUser when user has deletedAt set', async () => {
    const req = { cookies: { [cookieName]: 'tok' } } as unknown as AuthenticatedRequest;
    sessions.validateSessionToken.mockResolvedValue({
      sessionId: 's1',
      userId: 'u1',
      expiresAt: new Date('2038-01-01'),
    });
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      deletedAt: new Date('2026-06-06T00:00:00.000Z'),
    });

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toBeUndefined();
  });

  it('sets authUser and authSession when session and ACTIVE user are valid', async () => {
    const req = { cookies: { [cookieName]: 'tok' } } as unknown as AuthenticatedRequest;
    const validated = {
      sessionId: 's1',
      userId: 'u1',
      expiresAt: new Date('2038-01-01'),
    };
    sessions.validateSessionToken.mockResolvedValue(validated);
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toEqual({
      id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    });
    expect(req.authSession).toEqual(validated);
  });

  it('clears prior authUser when a second run has no session (no sticky identity)', async () => {
    const req = {
      headers: {},
      authUser: { id: 'stale', email: 'x', displayName: null, avatarUrl: null, status: UserStatus.ACTIVE },
      authSession: { sessionId: 'old', userId: 'stale', expiresAt: new Date() },
    } as AuthenticatedRequest;
    sessions.validateSessionToken.mockResolvedValue(null);

    await guard.canActivate(mockContext(req));
    expect(req.authUser).toBeUndefined();
    expect(req.authSession).toBeUndefined();
  });
});
