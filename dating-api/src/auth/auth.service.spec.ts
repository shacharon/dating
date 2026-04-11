import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserStatus } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import { GOOGLE_OAUTH_STATE_COOKIE_NAME } from './auth.constants';
import { AUTH_ERROR_CODES } from './auth-error-codes';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthVerifier } from './google-oauth.verifier';

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('AuthService (Google callback hardening)', () => {
  let service: AuthService;
  let users: {
    findByGoogleId: jest.Mock;
    findByEmail: jest.Mock;
    createFromGoogleIdentity: jest.Mock;
    updateLoginFields: jest.Mock;
  };
  let sessions: { createSession: jest.Mock };
  let google: { verifyAuthorizationCode: jest.Mock };
  let googleAuth: { verifyIdToken: jest.Mock };
  let cfg: {
    authSuccessRedirectUrl: string;
    sessionCookieName: string;
    sessionTtlDays: number;
    cookieDomain: undefined;
    cookieSecure: boolean;
  };

  const profile = {
    googleId: 'gid-new',
    email: 'new@example.com',
    displayName: 'N',
    avatarUrl: null as string | null,
  };

  beforeEach(async () => {
    users = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      createFromGoogleIdentity: jest.fn(),
      updateLoginFields: jest.fn(),
    };
    sessions = {
      createSession: jest
        .fn()
        .mockResolvedValue({ rawToken: 'rt', sessionId: 'sid', expiresAt: new Date() }),
    };
    google = { verifyAuthorizationCode: jest.fn().mockResolvedValue(profile) };
    googleAuth = { verifyIdToken: jest.fn() };
    cfg = {
      authSuccessRedirectUrl: 'http://localhost:3000/',
      sessionCookieName: 'dating_session',
      sessionTtlDays: 14,
      cookieDomain: undefined,
      cookieSecure: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthSessionConfigService, useValue: cfg },
        { provide: UsersService, useValue: users },
        { provide: SessionService, useValue: sessions },
        { provide: GoogleOAuthVerifier, useValue: google },
        { provide: GoogleAuthService, useValue: googleAuth },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  function mockRes(): { res: Response; redirect: jest.Mock } {
    const redirect = jest.fn();
    const res = {
      redirect,
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
    return { res, redirect };
  }

  function reqWithState(state: string): Request {
    return {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      cookies: { [GOOGLE_OAUTH_STATE_COOKIE_NAME]: state },
    } as unknown as Request;
  }

  it('redirects email_in_use when another user owns the email (new googleId)', async () => {
    const { res, redirect } = mockRes();
    users.findByGoogleId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue({
      id: 'other',
      email: profile.email,
      googleId: 'different-google',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });

    await service.handleGoogleOAuthCallback(
      reqWithState('s1'),
      res,
      { code: 'c1', state: 's1' },
    );

    expect(users.createFromGoogleIdentity).not.toHaveBeenCalled();
    expect(sessions.createSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining(`auth_error=${AUTH_ERROR_CODES.email_in_use}`),
    );
  });

  it('redirects disabled_user and skips session when existing user is disabled', async () => {
    const { res, redirect } = mockRes();
    users.findByGoogleId.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      googleId: profile.googleId,
      displayName: 'X',
      avatarUrl: null,
      status: UserStatus.DISABLED,
    });

    await service.handleGoogleOAuthCallback(
      reqWithState('s1'),
      res,
      { code: 'c1', state: 's1' },
    );

    expect(users.updateLoginFields).not.toHaveBeenCalled();
    expect(sessions.createSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining(`auth_error=${AUTH_ERROR_CODES.disabled_user}`),
    );
  });

  it('maps P2002 on create to email_in_use', async () => {
    const { res, redirect } = mockRes();
    users.findByGoogleId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(null);
    users.createFromGoogleIdentity.mockRejectedValue(p2002());

    await service.handleGoogleOAuthCallback(
      reqWithState('s1'),
      res,
      { code: 'c1', state: 's1' },
    );

    expect(sessions.createSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining(`auth_error=${AUTH_ERROR_CODES.email_in_use}`),
    );
  });

  it('maps P2002 on updateLoginFields to email_in_use', async () => {
    const { res, redirect } = mockRes();
    users.findByGoogleId.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      googleId: profile.googleId,
      displayName: 'X',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });
    users.findByEmail.mockResolvedValue(null);
    users.updateLoginFields.mockRejectedValue(p2002());

    await service.handleGoogleOAuthCallback(
      reqWithState('s1'),
      res,
      { code: 'c1', state: 's1' },
    );

    expect(sessions.createSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining(`auth_error=${AUTH_ERROR_CODES.email_in_use}`),
    );
  });

  it('redirects invalid_state when state cookie mismatches', async () => {
    const { res, redirect } = mockRes();
    await service.handleGoogleOAuthCallback(
      reqWithState('expected'),
      res,
      { code: 'c1', state: 'wrong' },
    );

    expect(google.verifyAuthorizationCode).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining(`auth_error=${AUTH_ERROR_CODES.invalid_state}`),
    );
  });

  it('redirects oauth_failed when Google returns error query', async () => {
    const { res, redirect } = mockRes();
    await service.handleGoogleOAuthCallback(reqWithState('s'), res, {
      error: 'access_denied',
    });
    expect(redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining(`auth_error=${AUTH_ERROR_CODES.oauth_failed}`),
    );
  });
});
