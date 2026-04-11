import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import type { GoogleIdentity } from '../users/google-identity.types';
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_MAX_AGE_MS,
  USER_STATUS_ACTIVE,
} from './auth.constants';
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_QUERY_PARAM,
  type AuthErrorCode,
} from './auth-error-codes';
import {
  httpOnlyLaxSessionCookieBase,
  parseCookieHeader,
  sessionMaxAgeMsFromTtlDays,
} from './auth-cookies.util';
import { toAuthMeResponseDto, type AuthMeResponseDto } from './auth.dto';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthVerifier } from './google-oauth.verifier';
import { isPrismaUniqueConstraintViolation } from './prisma-auth.errors';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function forbiddenAuthError(code: AuthErrorCode): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    auth_error: code,
  });
}

function authErrorFromForbidden(e: unknown): AuthErrorCode | null {
  if (!(e instanceof ForbiddenException)) {
    return null;
  }
  const payload = e.getResponse();
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'auth_error' in payload &&
    typeof (payload as { auth_error: unknown }).auth_error === 'string'
  ) {
    return (payload as { auth_error: AuthErrorCode }).auth_error;
  }
  return null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly cfg: AuthSessionConfigService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly googleOAuth: GoogleOAuthVerifier,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  startGoogleOAuth(res: Response): void {
    const clientId = this.cfg.googleClientId;
    const redirectUri = this.cfg.googleRedirectUri;
    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured (GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI).',
      );
    }

    const state = randomBytes(24).toString('hex');
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, {
      ...httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
      maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_MS,
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('include_granted_scopes', 'true');

    res.redirect(302, url.toString());
  }

  async handleGoogleOAuthCallback(
    req: Request,
    res: Response,
    query: { code?: string; state?: string; error?: string },
  ): Promise<void> {
    const successUrl = this.cfg.authSuccessRedirectUrl;
    const redirectWithAuthError = (code: AuthErrorCode) => {
      const u = new URL(successUrl);
      u.searchParams.set(AUTH_ERROR_QUERY_PARAM, code);
      res.redirect(302, u.toString());
    };

    if (query.error) {
      redirectWithAuthError(AUTH_ERROR_CODES.oauth_failed);
      return;
    }

    const code = query.code?.trim();
    const state = query.state?.trim();
    if (!code || !state) {
      redirectWithAuthError(AUTH_ERROR_CODES.oauth_failed);
      return;
    }

    const cookies =
      (req as Request & { cookies?: Record<string, string> }).cookies ??
      parseCookieHeader(req.headers.cookie);
    const expectedState = cookies[GOOGLE_OAUTH_STATE_COOKIE_NAME];
    if (!expectedState || expectedState !== state) {
      redirectWithAuthError(AUTH_ERROR_CODES.invalid_state);
      return;
    }

    res.clearCookie(
      GOOGLE_OAUTH_STATE_COOKIE_NAME,
      httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
    );

    let profile: GoogleIdentity;
    try {
      profile = await this.googleOAuth.verifyAuthorizationCode(code);
    } catch {
      redirectWithAuthError(AUTH_ERROR_CODES.oauth_failed);
      return;
    }

    let user: User;
    try {
      user = await this.resolveGoogleLoginUser(profile);
    } catch (e) {
      const authErr = authErrorFromForbidden(e);
      if (authErr) {
        redirectWithAuthError(authErr);
        return;
      }
      throw e;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : (req.socket.remoteAddress ?? undefined);

    const session = await this.sessions.createSession(user.id, {
      ip: ip ?? null,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
    });

    const maxAgeMs = sessionMaxAgeMsFromTtlDays(this.cfg.sessionTtlDays);
    res.cookie(this.cfg.sessionCookieName, session.rawToken, {
      ...httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
      maxAge: maxAgeMs,
    });

    res.redirect(302, successUrl);
  }

  /**
   * Cookie-based login using a Google OIDC `id_token` (SPA / native client flow).
   * Verifies token server-side, upserts user, issues session HttpOnly cookie.
   */
  async loginWithGoogleIdToken(
    req: Request,
    res: Response,
    body: { idToken?: unknown },
  ): Promise<AuthMeResponseDto> {
    const raw = typeof body?.idToken === 'string' ? body.idToken.trim() : '';
    if (!raw) {
      throw new BadRequestException('idToken is required');
    }

    const profile = await this.googleAuth.verifyIdToken(raw);
    const user = await this.resolveGoogleLoginUser(profile);

    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : (req.socket.remoteAddress ?? undefined);

    const session = await this.sessions.createSession(user.id, {
      ip: ip ?? null,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
    });

    const maxAgeMs = sessionMaxAgeMsFromTtlDays(this.cfg.sessionTtlDays);
    res.cookie(this.cfg.sessionCookieName, session.rawToken, {
      ...httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
      maxAge: maxAgeMs,
    });

    return toAuthMeResponseDto(user);
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const name = this.cfg.sessionCookieName;
    const fromParser = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[name];
    const raw =
      fromParser ?? parseCookieHeader(req.headers.cookie)[name] ?? undefined;

    if (raw?.trim()) {
      await this.sessions.revokeSession({ rawToken: raw.trim() });
    }

    res.clearCookie(
      name,
      httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
    );
    return { ok: true };
  }

  /**
   * Find/create/update user for Google identity; only ACTIVE users may receive a session.
   */
  private async resolveGoogleLoginUser(profile: GoogleIdentity): Promise<User> {
    const byGoogle = await this.users.findByGoogleId(profile.googleId);
    let user: User;

    if (byGoogle) {
      if (byGoogle.status !== USER_STATUS_ACTIVE) {
        throw forbiddenAuthError(AUTH_ERROR_CODES.disabled_user);
      }
      const emailOwner = await this.users.findByEmail(profile.email);
      if (emailOwner && emailOwner.id !== byGoogle.id) {
        throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
      }
      try {
        user = await this.users.updateLoginFields(byGoogle.id, profile);
      } catch (e) {
        if (isPrismaUniqueConstraintViolation(e)) {
          throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
        }
        throw e;
      }
    } else {
      const emailOwner = await this.users.findByEmail(profile.email);
      if (emailOwner) {
        if (emailOwner.googleId !== profile.googleId) {
          throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
        }
        if (emailOwner.status !== USER_STATUS_ACTIVE) {
          throw forbiddenAuthError(AUTH_ERROR_CODES.disabled_user);
        }
        try {
          user = await this.users.updateLoginFields(emailOwner.id, profile);
        } catch (e) {
          if (isPrismaUniqueConstraintViolation(e)) {
            throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
          }
          throw e;
        }
      } else {
        try {
          user = await this.users.createFromGoogleIdentity(profile);
        } catch (e) {
          if (isPrismaUniqueConstraintViolation(e)) {
            throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
          }
          throw e;
        }
      }
    }

    if (user.status !== USER_STATUS_ACTIVE) {
      throw forbiddenAuthError(AUTH_ERROR_CODES.disabled_user);
    }
    return user;
  }
}
