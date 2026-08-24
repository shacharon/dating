import { Injectable } from '@nestjs/common';
import { USER_STATUS_ACTIVE } from '../../auth/auth.constants';
import { PrismaService } from '../../prisma/prisma.service';
import type { ISessionConnectionReadRepository } from './session-connection-read.repository';

@Injectable()
export class PrismaSessionConnectionReadRepository
  implements ISessionConnectionReadRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async isSessionRowActive(sessionId: string): Promise<boolean> {
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

  async isUserActiveForConnection(userId: string): Promise<boolean> {
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
}
