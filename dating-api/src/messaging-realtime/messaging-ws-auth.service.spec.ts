import { UserStatus } from '@prisma/client';
import type { Handshake } from './messaging-ws-handshake.util';
import { MessagingWsAuthService } from './messaging-ws-auth.service';
import type { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { SessionService } from '../session/session.service';
import type { TokenService } from '../auth/token.service';
import type { UsersService } from '../users/users.service';

function handshake(
  init: Partial<Handshake> & { cookie?: string },
): Handshake {
  return {
    headers: { cookie: init.cookie },
    auth: init.auth,
    query: init.query,
  } as Handshake;
}

describe('MessagingWsAuthService', () => {
  const sessionCookieName = 'dating_session';
  const rawToken = 'raw-session-token-abc';
  const cookieHeader = `${sessionCookieName}=${rawToken}`;

  const authSessionConfig = {
    sessionCookieName,
  } as unknown as AuthSessionConfigService;

  const sessions = {
    validateSessionToken: jest.fn(),
  } as unknown as SessionService;

  const users = {
    findById: jest.fn(),
  } as unknown as UsersService;

  const tokens = {
    verifyAccessToken: jest.fn(),
  } as unknown as TokenService;

  let service: MessagingWsAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingWsAuthService(
      authSessionConfig,
      sessions,
      users,
      tokens,
    );
  });

  it('returns session ok for valid cookie, session, and active user', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_1',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_1',
      status: UserStatus.ACTIVE,
    });

    await expect(service.validateHandshake(handshake({ cookie: cookieHeader }))).resolves.toEqual({
      ok: true,
      authKind: 'session',
      userId: 'user_1',
      sessionId: 'sess_1',
    });
  });

  it('returns bearer ok for valid handshake.auth.token', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_jwt',
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_jwt',
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.validateHandshake(
        handshake({ auth: { token: 'access-jwt-token' } }),
      ),
    ).resolves.toEqual({
      ok: true,
      authKind: 'bearer',
      userId: 'user_jwt',
    });
    expect(sessions.validateSessionToken).not.toHaveBeenCalled();
  });

  it('returns bearer ok for valid query token', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_q',
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_q',
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.validateHandshake(handshake({ query: { token: 'query-jwt' } })),
    ).resolves.toEqual({
      ok: true,
      authKind: 'bearer',
      userId: 'user_q',
    });
  });

  it('returns invalid_token when bearer invalid and no cookie', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue(null);

    await expect(
      service.validateHandshake(
        handshake({ auth: { token: 'bad-jwt' } }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });

  it('returns invalid_session when bearer invalid and session cookie invalid', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue(null);
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue(null);

    await expect(
      service.validateHandshake(
        handshake({ auth: { token: 'bad-jwt' }, cookie: cookieHeader }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'invalid_session',
    });
  });

  it('does not fall back to cookie when bearer user is soft-deleted', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_deleted',
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_deleted',
      status: UserStatus.ACTIVE,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_1',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });

    await expect(
      service.validateHandshake(
        handshake({ auth: { token: 'jwt-deleted' }, cookie: cookieHeader }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
    expect(sessions.validateSessionToken).not.toHaveBeenCalled();
  });

  it('falls back to session when bearer invalid but cookie valid', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue(null);
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
      service.validateHandshake(
        handshake({ auth: { token: 'expired-jwt' }, cookie: cookieHeader }),
      ),
    ).resolves.toEqual({
      ok: true,
      authKind: 'session',
      userId: 'user_1',
      sessionId: 'sess_1',
    });
  });

  it('returns missing_cookie when cookie header is absent and no token', async () => {
    await expect(service.validateHandshake(handshake({}))).resolves.toEqual({
      ok: false,
      reason: 'missing_cookie',
    });
    expect(sessions.validateSessionToken).not.toHaveBeenCalled();
  });

  it('returns missing_cookie when session cookie name is not present', async () => {
    await expect(
      service.validateHandshake(handshake({ cookie: 'other_cookie=value' })),
    ).resolves.toEqual({
      ok: false,
      reason: 'missing_cookie',
    });
  });

  it('returns invalid_session when token validation fails', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue(null);

    await expect(
      service.validateHandshake(handshake({ cookie: cookieHeader })),
    ).resolves.toEqual({
      ok: false,
      reason: 'invalid_session',
    });
  });

  it('returns user_not_found when session user row is missing', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_missing',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    (users.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      service.validateHandshake(handshake({ cookie: cookieHeader })),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
  });

  it('returns user_not_found when bearer user is soft-deleted', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_deleted',
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_deleted',
      status: UserStatus.ACTIVE,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.validateHandshake(
        handshake({ auth: { token: 'jwt-deleted-user' } }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
  });

  it('returns user_not_found when session user is soft-deleted', async () => {
    (sessions.validateSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess_1',
      userId: 'user_deleted',
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_deleted',
      status: UserStatus.ACTIVE,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.validateHandshake(handshake({ cookie: cookieHeader })),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
  });

  it('returns user_disabled when bearer user is not ACTIVE', async () => {
    (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
      userId: 'user_disabled',
    });
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_disabled',
      status: UserStatus.DISABLED,
    });

    await expect(
      service.validateHandshake(
        handshake({ auth: { token: 'jwt-disabled' } }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_disabled',
    });
  });

  it('returns user_disabled when session user is not ACTIVE', async () => {
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
      service.validateHandshake(handshake({ cookie: cookieHeader })),
    ).resolves.toEqual({
      ok: false,
      reason: 'user_disabled',
    });
  });
});
