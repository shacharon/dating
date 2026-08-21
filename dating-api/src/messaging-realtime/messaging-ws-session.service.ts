import { Injectable } from '@nestjs/common';
import { USER_STATUS_ACTIVE } from '../auth/auth.constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingWsSessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Session row only (revoked / expired). Prefer {@link isConnectionAllowed} for revalidate. */
  async isSessionActive(sessionId: string): Promise<boolean> {
    return this.sessionRowActive(sessionId);
  }

  /**
   * Periodic WS revalidate: session still valid AND user not soft-deleted / disabled
   * (HTTP AuthGuard parity — Sprint 49 Story 3).
   */
  async isConnectionAllowed(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    if (!(await this.sessionRowActive(sessionId))) {
      return false;
    }

    const uid = userId.trim();
    if (!uid) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: uid },
      select: { deletedAt: true, status: true },
    });

    if (!user || user.deletedAt != null) {
      return false;
    }
    return user.status === USER_STATUS_ACTIVE;
  }

  private async sessionRowActive(sessionId: string): Promise<boolean> {
    const id = sessionId.trim();
    if (!id) {
      return false;
    }

    const row = await this.prisma.userSession.findUnique({
      where: { id },
      select: { revokedAt: true, expiresAt: true },
    });

    if (!row) {
      return false;
    }
    if (row.revokedAt != null) {
      return false;
    }
    return row.expiresAt.getTime() > Date.now();
  }
}
