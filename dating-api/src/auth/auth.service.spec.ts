import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import type { SessionService } from '../session/session.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { GoogleAuthService } from './google-auth.service';
import type { UsersService } from '../users/users.service';

describe('AuthService.logout', () => {
  it('disconnects messaging sockets for the session before revoke', async () => {
    const sessions = {
      validateSessionToken: jest.fn().mockResolvedValue({
        userId: 'user_1',
        sessionId: 'sess_1',
      }),
      revokeSession: jest.fn().mockResolvedValue(true),
    } as unknown as SessionService;

    const socketRegistry = {
      disconnectBySessionId: jest.fn(),
    } as unknown as MessagingSocketRegistry;

    const service = new AuthService(
      {
        sessionCookieName: 'dating_session',
        cookieSecure: false,
        cookieDomain: undefined,
      } as AuthSessionConfigService,
      {} as UsersService,
      sessions,
      {} as GoogleAuthService,
      { trace: jest.fn() } as unknown as StructuredObservabilityService,
      socketRegistry,
    );

    const req = {
      headers: { cookie: 'dating_session=raw-token' },
    } as Request;
    const res = { clearCookie: jest.fn() } as unknown as Response;

    await service.logout(req, res);

    expect(socketRegistry.disconnectBySessionId).toHaveBeenCalledWith(
      'sess_1',
    );
    expect(sessions.revokeSession).toHaveBeenCalled();
  });
});
