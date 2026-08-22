import { Injectable } from '@nestjs/common';
import type { Handshake } from 'socket.io/dist/socket-types';
import { parseCookieHeader } from '../auth/auth-cookies.util';
import { USER_STATUS_ACTIVE } from '../auth/auth.constants';
import { TokenService } from '../auth/token.service';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import { readHandshakeAccessToken } from './messaging-ws-handshake.util';

export type MessagingSocketData = {
  userId: string;
  authKind: 'session' | 'bearer';
  sessionId?: string;
  bearerAccessToken?: string;
  subscribedConversationIds?: Set<string>;
  sessionCheckTimer?: ReturnType<typeof setInterval>;
};

export type WsAuthFailureReason =
  | 'missing_cookie'
  | 'invalid_session'
  | 'invalid_token'
  | 'user_not_found'
  | 'user_disabled';

export type WsAuthResult =
  | { ok: true; authKind: 'session'; userId: string; sessionId: string }
  | { ok: true; authKind: 'bearer'; userId: string }
  | { ok: false; reason: WsAuthFailureReason };

@Injectable()
export class MessagingWsAuthService {
  constructor(
    private readonly authSessionConfig: AuthSessionConfigService,
    private readonly sessions: SessionService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  async validateHandshake(handshake: Handshake): Promise<WsAuthResult> {
    const attemptedToken = readHandshakeAccessToken(handshake);

    if (attemptedToken) {
      const bearerResult = await this.validateBearerToken(attemptedToken);
      if (bearerResult.ok) {
        return bearerResult;
      }
      if (bearerResult.reason === 'user_not_found' || bearerResult.reason === 'user_disabled') {
        return bearerResult;
      }
    }

    const cookieResult = await this.validateSessionCookie(
      handshake.headers.cookie,
    );
    if (cookieResult.ok) {
      return cookieResult;
    }

    if (attemptedToken && cookieResult.reason === 'missing_cookie') {
      return { ok: false, reason: 'invalid_token' };
    }

    return cookieResult;
  }

  private async validateBearerToken(token: string): Promise<WsAuthResult> {
    const verified = await this.tokens.verifyAccessToken(token);
    if (!verified) {
      return { ok: false, reason: 'invalid_token' };
    }

    const user = await this.users.findById(verified.userId);
    if (!user || user.deletedAt != null) {
      return { ok: false, reason: 'user_not_found' };
    }
    if (user.status !== USER_STATUS_ACTIVE) {
      return { ok: false, reason: 'user_disabled' };
    }

    return { ok: true, authKind: 'bearer', userId: verified.userId };
  }

  private async validateSessionCookie(
    cookieHeader: string | undefined,
  ): Promise<WsAuthResult> {
    const cookieName = this.authSessionConfig.sessionCookieName;
    const raw = parseCookieHeader(cookieHeader)[cookieName]?.trim();
    if (!raw) {
      return { ok: false, reason: 'missing_cookie' };
    }

    const validated = await this.sessions.validateSessionToken(raw);
    if (!validated) {
      return { ok: false, reason: 'invalid_session' };
    }

    const user = await this.users.findById(validated.userId);
    if (!user || user.deletedAt != null) {
      return { ok: false, reason: 'user_not_found' };
    }
    if (user.status !== USER_STATUS_ACTIVE) {
      return { ok: false, reason: 'user_disabled' };
    }

    return {
      ok: true,
      authKind: 'session',
      userId: validated.userId,
      sessionId: validated.sessionId,
    };
  }
}
