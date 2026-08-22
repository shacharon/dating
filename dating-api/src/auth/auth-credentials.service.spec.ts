import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import type { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { SessionService } from '../session/session.service';
import type { UsersService } from '../users/users.service';
import { AuthCredentialsService } from './auth-credentials.service';
import type { TokenService } from './token.service';

describe('AuthCredentialsService', () => {
  let tokens: jest.Mocked<Pick<TokenService, 'verifyAccessToken'>>;
  let sessions: jest.Mocked<Pick<SessionService, 'validateSessionToken'>>;
  let users: jest.Mocked<Pick<UsersService, 'findById'>>;
  let cfg: Pick<AuthSessionConfigService, 'sessionCookieName'>;
  let service: AuthCredentialsService;

  beforeEach(() => {
    tokens = { verifyAccessToken: jest.fn() };
    sessions = { validateSessionToken: jest.fn() };
    users = { findById: jest.fn() };
    cfg = { sessionCookieName: 'dating_session' };
    service = new AuthCredentialsService(
      tokens as unknown as TokenService,
      sessions as unknown as SessionService,
      users as unknown as UsersService,
      cfg as AuthSessionConfigService,
    );
  });

  it('resolveForGuard prefers Bearer over session cookie', async () => {
    tokens.verifyAccessToken.mockResolvedValue({ userId: 'u_bearer' });
    users.findById.mockResolvedValue({
      id: 'u_bearer',
      email: 'b@example.com',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    } as never);

    const req = {
      headers: { authorization: 'Bearer access-jwt' },
      cookies: { dating_session: 'should-not-be-used' },
    } as unknown as Request;

    const result = await service.resolveForGuard(req);
    expect(result).toEqual({
      status: 'ok',
      auth: {
        kind: 'bearer',
        user: expect.objectContaining({ id: 'u_bearer' }),
      },
    });
    expect(sessions.validateSessionToken).not.toHaveBeenCalled();
  });

  it('resolveForGuard returns disabled for inactive bearer user', async () => {
    tokens.verifyAccessToken.mockResolvedValue({ userId: 'u_off' });
    users.findById.mockResolvedValue({
      id: 'u_off',
      email: 'off@example.com',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.DISABLED,
      deletedAt: null,
    } as never);

    const req = {
      headers: { authorization: 'Bearer access-jwt' },
    } as unknown as Request;

    await expect(service.resolveForGuard(req)).resolves.toEqual({
      status: 'disabled',
    });
  });

  it('resolveOptional returns null for invalid bearer without trying cookie', async () => {
    tokens.verifyAccessToken.mockResolvedValue(null);

    const req = {
      headers: { authorization: 'Bearer bad' },
      cookies: { dating_session: 'ignored' },
    } as unknown as Request;

    await expect(service.resolveOptional(req)).resolves.toBeNull();
    expect(sessions.validateSessionToken).not.toHaveBeenCalled();
  });
});
