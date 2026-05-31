import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MatchActionDto, MatchActionStateDto } from './me-match-actions.dto';
import { MeMatchesService } from './me-matches.service';

@Injectable()
export class MeMatchActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meMatches: MeMatchesService,
  ) {}

  async getActionState(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<MatchActionStateDto> {
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
      select: { action: true, createdAt: true },
    });

    if (!row) {
      return { action: null };
    }

    return {
      action: row.action,
      createdAt: row.createdAt.toISOString(),
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

    const row = await this.prisma.matchAction.upsert({
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

    return {
      id: row.id,
      actorUserId: row.actorUserId,
      targetUserId: row.targetUserId,
      targetProfileIdSnapshot: row.targetProfileIdSnapshot,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
    };
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
