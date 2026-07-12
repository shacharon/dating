import { UserStatus } from '@prisma/client';
import { MessagingWsAuthService } from './messaging-ws-auth.service';
import type { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { SessionService } from '../session/session.service';
import type { UsersService } from '../users/users.service';

describe('MessagingWsAuthService', () => {
  const sessionCookieName = 'dating_session';
  const rawToken = 'raw-session-token-abc';

  const authSessionConfig = {
    sessionCookieName,
  } as unknown as AuthSessionConfigService;

  const sessions = {
    validateSessionToken: jest.fn(),
  } as unknown as SessionService;

  const users = {
    findById: jest.fn(),
  } as unknown as UsersService;

  let service: MessagingWsAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingWsAuthService(authSessionConfig, sessions, users);
  });

  it('returns ok for valid cookie, session, and active user', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_1',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_1',
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.validateHandshake(`${sessionCookieName}=${rawToken}`),
    ).resolves.toEqual({
      ok: true,
      userId: 'user_1',
      sessionId: 'sess_1',
    });
  });

  it('returns missing_cookie when cookie header is absent', async () => {
    await expect(service.validateHandshake(undefined)).resolves.toEqual({
      ok: false,
      reason: 'missing_cookie',
    });
    expect(sessions.validateSessionToken).not.toHaveBeenCalled();
  });

  it('returns missing_cookie when session cookie name is not present', async () => {
    await expect(
      service.validateHandshake('other_cookie=value'),
    ).resolves.toEqual({
      ok: false,
      reason: 'missing_cookie',
    });
  });

  it('returns invalid_session when token validation fails', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue(null);

    await expect(
      service.validateHandshake(`${sessionCookieName}=${rawToken}`),
    ).resolves.toEqual({
      ok: false,
      reason: 'invalid_session',
    });
  });

  it('returns user_not_found when user row is missing', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_missing',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    (users.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      service.validateHandshake(`${sessionCookieName}=${rawToken}`),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
  });

  it('returns user_disabled when user is not ACTIVE', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_disabled',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_disabled',
      status: UserStatus.DISABLED,
    });

    await expect(
      service.validateHandshake(`${sessionCookieName}=${rawToken}`),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_disabled',
    });
  });
});
