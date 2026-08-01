import { Injectable } from '@nestjs/common';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_LAST_SEEN_THROTTLE_MS } from './session.constants';
import { generateSessionToken, hashSessionToken } from './session-token.crypto';
import type {
  CreateSessionMetadata,
  CreateSessionResult,
  ValidatedSession,
} from './session.types';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSessionConfig: AuthSessionConfigService,
  ) {}

  /**
   * Creates a server-side session row storing only {@link hashSessionToken}.
   * Returns the raw token once for the caller to place in an HttpOnly cookie.
   */
  async createSession(
    userId: string,
    metadata?: CreateSessionMetadata,
  ): Promise<CreateSessionResult> {
    const pepper = this.requirePepper();
    const rawToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(rawToken, pepper);
    const ttlDays = this.authSessionConfig.sessionTtlDays;
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + ttlDays);

    const row = await this.prisma.userSession.create({
      data: {
        userId,
        sessionTokenHash,
        expiresAt,
        ip: metadata?.ip ?? undefined,
        userAgent: metadata?.userAgent ?? undefined,
      },
    });

    return {
      rawToken,
      sessionId: row.id,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * Resolves a cookie/session bearer to a user session, or `null` if missing,
   * revoked, expired, malformed, or pepper is not configured.
   * Updates `lastSeenAt` when valid and due (throttled).
   */
  async validateSessionToken(
    rawToken: string | undefined | null,
  ): Promise<ValidatedSession | null> {
    const trimmed = rawToken?.trim();
    if (!trimmed) {
      return null;
    }
    const pepper = this.authSessionConfig.sessionSecretPepper;
    if (!pepper) {
      return null;
    }
    const sessionTokenHash = hashSessionToken(trimmed, pepper);
    const now = new Date();

    const row = await this.prisma.userSession.findUnique({
      where: { sessionTokenHash },
    });
    if (!row) {
      return null;
    }
    if (row.revokedAt != null) {
      return null;
    }
    if (row.expiresAt.getTime() <= now.getTime()) {
      return null;
    }

    const shouldTouchLastSeen =
      row.lastSeenAt == null ||
      now.getTime() - row.lastSeenAt.getTime() >= SESSION_LAST_SEEN_THROTTLE_MS;

    if (shouldTouchLastSeen) {
      try {
        await this.prisma.userSession.update({
          where: { id: row.id },
          data: { lastSeenAt: now },
        });
      } catch {
        /* row may race-delete; validation still stands */
      }
    }

    return {
      sessionId: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * Sets `revokedAt` for the matching session (id or raw token hash lookup).
   * Returns whether a session row was updated.
   */
  async revokeSession(
    input: { rawToken: string } | { sessionId: string },
  ): Promise<boolean> {
    const now = new Date();

    if ('sessionId' in input) {
      const id = input.sessionId.trim();
      if (!id) {
        return false;
      }
      const res = await this.prisma.userSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: now },
      });
      return res.count > 0;
    }

    const raw = input.rawToken.trim();
    if (!raw) {
      return false;
    }
    const pepper = this.authSessionConfig.sessionSecretPepper;
    if (!pepper) {
      return false;
    }
    const sessionTokenHash = hashSessionToken(raw, pepper);
    const res = await this.prisma.userSession.updateMany({
      where: { sessionTokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
    return res.count > 0;
  }

  /** Sets `revokedAt` on all active sessions for a user. Returns rows updated. */
  async revokeAllSessionsForUser(userId: string): Promise<number> {
    const id = userId.trim();
    if (!id) {
      return 0;
    }
    const now = new Date();
    const res = await this.prisma.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: now },
    });
    return res.count;
  }

  private requirePepper(): string {
    const pepper = this.authSessionConfig.sessionSecretPepper;
    if (!pepper) {
      throw new Error(
        'SESSION_SECRET_PEPPER is not configured; cannot create sessions.',
      );
    }
    return pepper;
  }
}
