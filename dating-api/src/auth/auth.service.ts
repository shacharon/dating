import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { ErrorCodes } from '../logging/error-codes';
import { mergeRequestLogContext } from '../logging/request-log-context';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import type { GoogleIdentity } from '../users/google-identity.types';
import { USER_STATUS_ACTIVE } from './auth.constants';
import { AUTH_ERROR_CODES, type AuthErrorCode } from './auth-error-codes';
import {
  httpOnlyLaxSessionCookieBase,
  readRequestCookieJar,
  sessionMaxAgeMsFromTtlDays,
} from './auth-cookies.util';
import { toAuthMeResponseDto, type AuthMeResponseDto } from './auth.dto';
import { GoogleAuthService } from './google-auth.service';
import { isPrismaUniqueConstraintViolation } from './prisma-auth.errors';
import { ReferralAttributionService } from './referral-attribution.service';

function forbiddenAuthError(code: AuthErrorCode): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    auth_error: code,
  });
}

function rethrowCause(cause: unknown): never {
  if (cause instanceof Error) {
    throw cause;
  }
  throw new Error('Unexpected error', { cause });
}

@Injectable()
export class AuthService {
  constructor(
    private readonly cfg: AuthSessionConfigService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly googleAuth: GoogleAuthService,
    private readonly obs: StructuredObservabilityService,
    private readonly socketRegistry: MessagingSocketRegistry,
    private readonly referralAttribution: ReferralAttributionService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Cookie-based login using a Google OIDC `id_token` (SPA / native client flow).
   * Verifies token server-side, upserts user, issues session HttpOnly cookie.
   */
  async loginWithGoogleIdToken(
    req: Request,
    res: Response,
    body: { idToken?: unknown; referredByUserId?: unknown },
  ): Promise<AuthMeResponseDto> {
    this.obs.trace(
      'google id token login started',
      ErrorCodes.AUTH_LOGIN_START,
    );
    try {
      const raw = typeof body?.idToken === 'string' ? body.idToken.trim() : '';
      if (!raw) {
        throw new BadRequestException('idToken is required');
      }

      const profile = await this.googleAuth.verifyIdToken(raw);
      const referredByUserId =
        typeof body.referredByUserId === 'string'
          ? body.referredByUserId
          : undefined;
      const { user } = await this.resolveGoogleLoginUser(
        profile,
        referredByUserId,
      );

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

      mergeRequestLogContext({
        userId: user.id,
        sessionId: session.sessionId,
      });

      const maxAgeMs = sessionMaxAgeMsFromTtlDays(this.cfg.sessionTtlDays);
      res.cookie(this.cfg.sessionCookieName, session.rawToken, {
        ...httpOnlyLaxSessionCookieBase({
          secure: this.cfg.cookieSecure,
          domain: this.cfg.cookieDomain,
        }),
        maxAge: maxAgeMs,
      });

      this.obs.trace(
        `google id token login success userId=${user.id}`,
        ErrorCodes.AUTH_LOGIN_SUCCESS,
      );
      return toAuthMeResponseDto(user);
    } catch (e: unknown) {
      const includeStack = !(e instanceof HttpException);
      this.obs.error(
        e instanceof Error ? e.message : 'google id token login failed',
        ErrorCodes.AUTH_LOGIN_FAILURE,
        includeStack ? e : undefined,
        { includeStack },
      );
      throw e;
    }
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const name = this.cfg.sessionCookieName;
    const raw = readRequestCookieJar(req)[name] ?? undefined;

    if (raw?.trim()) {
      const validated = await this.sessions.validateSessionToken(raw.trim());
      if (validated) {
        mergeRequestLogContext({
          userId: validated.userId,
          sessionId: validated.sessionId,
        });
        await this.socketRegistry.disconnectBySessionId(validated.sessionId);
      }
      await this.sessions.revokeSession({ rawToken: raw.trim() });
    }

    res.clearCookie(
      name,
      httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
    );
    this.obs.trace('logout completed', ErrorCodes.AUTH_LOGOUT);
    return { ok: true };
  }

  /**
   * Find/create/update user for Google identity; only ACTIVE users may receive a session.
   */
  private async resolveGoogleLoginUser(
    profile: GoogleIdentity,
    referredByUserId?: string,
  ): Promise<{ user: User; isNewUser: boolean }> {
    const byGoogle = await this.users.findByGoogleId(profile.googleId);
    let user: User;
    let isNewUser = false;

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
      } catch (cause: unknown) {
        if (isPrismaUniqueConstraintViolation(cause)) {
          throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
        }
        rethrowCause(cause);
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
        } catch (cause: unknown) {
          if (isPrismaUniqueConstraintViolation(cause)) {
            throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
          }
          rethrowCause(cause);
        }
      } else {
        const resolvedReferrer =
          await this.referralAttribution.resolveReferrerUserId(
            referredByUserId,
            '',
          );
        try {
          user = await this.users.createFromGoogleIdentity(profile, {
            referredByUserId: resolvedReferrer,
          });
          isNewUser = true;
          if (resolvedReferrer) {
            this.obs.trace(
              `event=referral_signup_attributed userId=${user.id} referredByUserId=${resolvedReferrer}`,
              ErrorCodes.REFERRAL_SIGNUP_ATTRIBUTED,
            );
            this.analytics.track(
              user.id,
              ProductAnalyticsEvents.REFERRAL_SIGNUP_COMPLETED,
              {},
            );
          }
        } catch (cause: unknown) {
          if (isPrismaUniqueConstraintViolation(cause)) {
            throw forbiddenAuthError(AUTH_ERROR_CODES.email_in_use);
          }
          rethrowCause(cause);
        }
      }
    }

    if (user.status !== USER_STATUS_ACTIVE) {
      throw forbiddenAuthError(AUTH_ERROR_CODES.disabled_user);
    }
    return { user, isNewUser };
  }
}
