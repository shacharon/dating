import { Inject, Injectable } from '@nestjs/common';
import { TokenService } from '../auth/token.service';
import {
  SESSION_CONNECTION_READ,
  type ISessionConnectionReadRepository,
} from '../session/repositories/session-connection-read.repository';

@Injectable()
export class MessagingWsSessionService {
  constructor(
    @Inject(SESSION_CONNECTION_READ)
    private readonly connectionRead: ISessionConnectionReadRepository,
    private readonly tokens: TokenService,
  ) {}

  /** Session row only (revoked / expired). Prefer {@link isConnectionAllowed} for revalidate. */
  isSessionActive(sessionId: string): Promise<boolean> {
    return this.connectionRead.isSessionRowActive(sessionId);
  }

  /**
   * Periodic WS revalidate: session still valid AND user not soft-deleted / disabled
   * (HTTP AuthGuard parity — Sprint 49 Story 3).
   */
  async isConnectionAllowed(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    if (!(await this.connectionRead.isSessionRowActive(sessionId))) {
      return false;
    }
    return this.isUserActive(userId);
  }

  /** Bearer WS revalidate: JWT still valid AND user active. */
  async isBearerConnectionAllowed(
    userId: string,
    accessToken: string,
  ): Promise<boolean> {
    const verified = await this.tokens.verifyAccessToken(accessToken);
    if (!verified || verified.userId !== userId.trim()) {
      return false;
    }
    return this.isUserActive(userId);
  }

  private async isUserActive(userId: string): Promise<boolean> {
    const uid = userId.trim();
    if (!uid) {
      return false;
    }

    return this.connectionRead.isUserActiveForConnection(uid);
  }
}
