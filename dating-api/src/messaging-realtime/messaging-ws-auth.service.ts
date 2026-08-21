import { Injectable } from '@nestjs/common';
import { parseCookieHeader } from '../auth/auth-cookies.util';
import { USER_STATUS_ACTIVE } from '../auth/auth.constants';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';

export type MessagingSocketData = {
  userId: string;
  sessionId: string;
  subscribedConversationIds?: Set<string>;
  sessionCheckTimer?: ReturnType<typeof setInterval>;
};

export type WsAuthFailureReason =
  | 'missing_cookie'
  | 'invalid_session'
  | 'user_not_found'
  | 'user_disabled';

export type WsAuthResult =
  | { ok: true; userId: string; sessionId: string }
  | { ok: false; reason: WsAuthFailureReason };

@Injectable()
export class MessagingWsAuthService {
  constructor(
    private readonly authSessionConfig: AuthSessionConfigService,
    private readonly sessions: SessionService,
    private readonly users: UsersService,
  ) {}

  async validateHandshake(
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
    // Match AuthGuard: soft-deleted ≈ missing (no distinct user_deleted reason).
    if (!user || user.deletedAt != null) {
      return { ok: false, reason: 'user_not_found' };
    }
    if (user.status !== USER_STATUS_ACTIVE) {
      return { ok: false, reason: 'user_disabled' };
    }

    return {
      ok: true,
      userId: validated.userId,
      sessionId: validated.sessionId,
    };
  }
}
