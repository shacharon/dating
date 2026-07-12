import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingWsSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async isSessionActive(sessionId: string): Promise<boolean> {
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
