import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchActionType, MutualMatch, MutualMatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MatchActionDto, MatchActionStateDto } from './me-match-actions.dto';
import { MeMatchesService } from './me-matches.service';
import { MutualMatchesService } from './mutual-matches.service';

@Injectable()
export class MeMatchActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meMatches: MeMatchesService,
    private readonly mutualMatches: MutualMatchesService,
  ) {}

  async getActionState(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<MatchActionStateDto> {
    const { targetUserId } = await this.meMatches.assertMatchCandidateVisible(
      actorUserId,
      candidateProfileId,
    );

    const [row, mutual] = await Promise.all([
      this.prisma.matchAction.findUnique({
        where: {
          actorUserId_targetUserId: {
            actorUserId,
            targetUserId,
          },
        },
        select: { action: true, createdAt: true },
      }),
      this.mutualMatches.findActiveByUserPair(actorUserId, targetUserId),
    ]);

    if (!row) {
      return {
        action: null,
        mutualMatch: !!mutual,
        conversationId: mutual?.id ?? null,
      };
    }

    return {
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      mutualMatch: !!mutual,
      conversationId: mutual?.id ?? null,
    };
  }

  async createAction(
    actorUserId: string,
    candidateProfileId: string,
    action: MatchActionType,
  ): Promise<MatchActionDto> {
    const { candidateProfileId: profileId, targetUserId } =
      await this.meMatches.assertMatchCandidateVisible(
        actorUserId,
        candidateProfileId,
      );

    if (targetUserId === actorUserId) {
      throw new BadRequestException('Cannot act on yourself');
    }

    let detectResult: MutualMatch | null = null;

    const row = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.matchAction.upsert({
        where: {
          actorUserId_targetUserId: {
            actorUserId,
            targetUserId,
          },
        },
        create: {
          actorUserId,
          targetUserId,
          targetProfileIdSnapshot: profileId,
          action,
        },
        update: {
          action,
          targetProfileIdSnapshot: profileId,
        },
      });

      if (action === MatchActionType.LIKE) {
        detectResult = await this.mutualMatches.detectAndCreateMutualMatch(
          actorUserId,
          targetUserId,
          tx,
        );
      }

      return upserted;
    });

    const mutualFields =
      action === MatchActionType.LIKE
        ? this.mutualFieldsFromDetectResult(detectResult)
        : { mutualMatch: false, conversationId: null };

    return {
      id: row.id,
      actorUserId: row.actorUserId,
      targetUserId: row.targetUserId,
      targetProfileIdSnapshot: row.targetProfileIdSnapshot,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      mutualMatch: mutualFields.mutualMatch,
      conversationId: mutualFields.conversationId,
    };
  }

  private mutualFieldsFromDetectResult(
    row: MutualMatch | null,
  ): { mutualMatch: boolean; conversationId: string | null } {
    if (row?.status === MutualMatchStatus.ACTIVE) {
      return { mutualMatch: true, conversationId: row.id };
    }
    return { mutualMatch: false, conversationId: null };
  }

  async deleteAction(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<void> {
    const { targetUserId } = await this.meMatches.assertMatchCandidateVisible(
      actorUserId,
      candidateProfileId,
    );

    const row = await this.prisma.matchAction.findUnique({
      where: {
        actorUserId_targetUserId: {
          actorUserId,
          targetUserId,
        },
      },
      select: { action: true },
    });

    if (!row) {
      throw new NotFoundException('No action to undo');
    }

    if (row.action === MatchActionType.BLOCK) {
      throw new ForbiddenException('Blocked matches cannot be undone');
    }

    await this.prisma.matchAction.delete({
      where: {
        actorUserId_targetUserId: {
          actorUserId,
          targetUserId,
        },
      },
    });
  }
}
