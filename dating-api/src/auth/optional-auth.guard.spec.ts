import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedRequest } from './auth-request.types';
import { AuthCredentialsService } from './auth-credentials.service';
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
  let credentials: { resolveOptional: jest.Mock };

  beforeEach(async () => {
    credentials = { resolveOptional: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionalAuthGuard,
        { provide: AuthCredentialsService, useValue: credentials },
      ],
    }).compile();
    guard = module.get(OptionalAuthGuard);
  });

  it('returns true without setting authUser when credentials are missing', async () => {
    const req = { headers: {} } as AuthenticatedRequest;
    credentials.resolveOptional.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser).toBeUndefined();
    expect(req.authSession).toBeUndefined();
  });

  it('sets authUser and authSession for valid session credentials', async () => {
    const req = { cookies: { dating_session: 'tok' } } as unknown as AuthenticatedRequest;
    const validated = {
      sessionId: 's1',
      userId: 'u1',
      expiresAt: new Date('2038-01-01'),
    };
    credentials.resolveOptional.mockResolvedValue({
      kind: 'session',
      user: {
        id: 'u1',
        email: 'a@b.com',
        displayName: 'A',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
      session: validated,
    });

    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
    expect(req.authUser?.id).toBe('u1');
    expect(req.authSession).toEqual(validated);
    expect(req.authMethod).toBe('session');
  });

  it('sets authUser for valid bearer credentials without authSession', async () => {
    const req = {
      headers: { authorization: 'Bearer jwt-access' },
    } as unknown as AuthenticatedRequest;
    credentials.resolveOptional.mockResolvedValue({
      kind: 'bearer',
      user: {
        id: 'u2',
        email: 'b@c.com',
        displayName: null,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
    });

    await guard.canActivate(mockContext(req));
    expect(req.authUser?.id).toBe('u2');
    expect(req.authSession).toBeUndefined();
    expect(req.authMethod).toBe('bearer');
  });

  it('clears prior authUser when a second run has no credentials', async () => {
    const req = {
      headers: {},
      authUser: {
        id: 'stale',
        email: 'x',
        displayName: null,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
      authSession: { sessionId: 'old', userId: 'stale', expiresAt: new Date() },
    } as AuthenticatedRequest;
    credentials.resolveOptional.mockResolvedValue(null);

    await guard.canActivate(mockContext(req));
    expect(req.authUser).toBeUndefined();
    expect(req.authSession).toBeUndefined();
  });
});
