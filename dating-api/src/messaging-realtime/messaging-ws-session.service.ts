import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_CONNECTION_READ,
  type ISessionConnectionReadRepository,
} from '../session/repositories/session-connection-read.repository';

@Injectable()
export class MessagingWsSessionService {
  constructor(
    @Inject(SESSION_CONNECTION_READ)
    private readonly connectionRead: ISessionConnectionReadRepository,
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

    const uid = userId.trim();
    if (!uid) {
      return false;
    }

    return this.connectionRead.isUserActiveForConnection(uid);
  }
}
