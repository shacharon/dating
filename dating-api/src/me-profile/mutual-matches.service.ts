import { Injectable } from '@nestjs/common';
import {
  MatchActionType,
  MutualMatch,
  MutualMatchStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type MutualMatchDetectResult = {
  mutualMatch: MutualMatch;
  /** True only when ACTIVE row was newly created in this call. */
  created: boolean;
};

@Injectable()
export class MutualMatchesService {
  constructor(private readonly prisma: PrismaService) {}

  sortUserPair(userA: string, userB: string): [string, string] {
    return userA < userB ? [userA, userB] : [userB, userA];
  }

  async detectAndCreateMutualMatch(
    actorUserId: string,
    targetUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<MutualMatchDetectResult | null> {
    const db = tx ?? this.prisma;

    const reverse = await db.matchAction.findUnique({
      where: {
        actorUserId_targetUserId: {
          actorUserId: targetUserId,
          targetUserId: actorUserId,
        },
      },
      select: { action: true },
    });

    if (reverse?.action !== MatchActionType.LIKE) {
      return null;
    }

    const [userId1, userId2] = this.sortUserPair(actorUserId, targetUserId);

    const existing = await db.mutualMatch.findUnique({
      where: { userId1_userId2: { userId1, userId2 } },
    });

    if (existing?.status === MutualMatchStatus.ACTIVE) {
      return { mutualMatch: existing, created: false };
    }

    if (existing) {
      return { mutualMatch: existing, created: false };
    }

    const mutualMatch = await db.mutualMatch.create({
      data: { userId1, userId2, status: MutualMatchStatus.ACTIVE },
    });

    return { mutualMatch, created: true };
  }

  async findActiveByUserPair(
    userA: string,
    userB: string,
  ): Promise<MutualMatch | null> {
    const [userId1, userId2] = this.sortUserPair(userA, userB);

    return this.prisma.mutualMatch.findFirst({
      where: {
        userId1,
        userId2,
        status: MutualMatchStatus.ACTIVE,
      },
    });
  }
}
