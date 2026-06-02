import { Injectable } from '@nestjs/common';
import {
  MatchActionType,
  MutualMatch,
  MutualMatchStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  ): Promise<MutualMatch | null> {
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

    return db.mutualMatch.upsert({
      where: { userId1_userId2: { userId1, userId2 } },
      create: { userId1, userId2, status: MutualMatchStatus.ACTIVE },
      update: {},
    });
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
