import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IContentViolationRepository } from './content-violation.repository';
import type {
  AdminBlockedUserRow,
  AdminViolationListArgs,
  AdminViolationRow,
  CreateViolationInput,
  UserViolationFields,
  ViolationStatsRaw,
} from './content-violation.repository.types';

const BLOCKED_STATUSES = ['profile_edit_blocked', 'messaging_muted'] as const;

@Injectable()
export class PrismaContentViolationRepository implements IContentViolationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createViolationAndIncrementCount(
    data: CreateViolationInput,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userContentViolation.create({ data }),
      this.prisma.user.update({
        where: { id: data.userId },
        data: { contentViolationCount: { increment: 1 } },
      }),
    ]);
  }

  countViolations(filter: {
    userId: string;
    surface?: string;
    surfacePrefix?: string;
    since?: Date;
  }): Promise<number> {
    const surfaceFilter =
      filter.surface != null
        ? { surface: filter.surface }
        : filter.surfacePrefix != null
          ? { surface: { startsWith: filter.surfacePrefix } }
          : {};
    return this.prisma.userContentViolation.count({
      where: {
        userId: filter.userId,
        ...surfaceFilter,
        ...(filter.since != null ? { createdAt: { gte: filter.since } } : {}),
      },
    });
  }

  getUserViolationFields(userId: string): Promise<UserViolationFields | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentViolationStatus: true,
        contentViolationMutedUntil: true,
        contentViolationCount: true,
      },
    });
  }

  async setProfileEditBlocked(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { contentViolationStatus: 'profile_edit_blocked' },
    });
  }

  async setMessagingMute(
    userId: string,
    mutedUntil: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: mutedUntil,
      },
    });
  }

  async resetViolationStatus(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
  }

  async clearExpiredMutes(now: Date): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: { not: null, lte: now },
      },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
    return result.count;
  }

  async getViolationStatsRaw(): Promise<ViolationStatsRaw> {
    const [
      byCategory,
      bySurface,
      totalViolations,
      blockedProfileUsers,
      mutedUsers,
    ] = await Promise.all([
      this.prisma.userContentViolation.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
      this.prisma.userContentViolation.groupBy({
        by: ['surface'],
        _count: { _all: true },
      }),
      this.prisma.userContentViolation.count(),
      this.prisma.user.count({
        where: { contentViolationStatus: 'profile_edit_blocked' },
      }),
      this.prisma.user.findMany({
        where: { contentViolationStatus: 'messaging_muted' },
        select: { contentViolationMutedUntil: true },
      }),
    ]);
    return {
      byCategory: byCategory.map((row) => ({
        category: row.category,
        count: row._count._all,
      })),
      bySurface: bySurface.map((row) => ({
        surface: row.surface,
        count: row._count._all,
      })),
      totalViolations,
      blockedProfileUsers,
      mutedUsers,
    };
  }

  async findViolationsForAdmin(
    args: AdminViolationListArgs,
  ): Promise<{ rows: AdminViolationRow[]; total: number }> {
    const where: Prisma.UserContentViolationWhereInput = {};
    if (args.surface != null) where.surface = args.surface;
    if (args.category != null) where.category = args.category;
    if (args.userId != null) where.userId = args.userId;
    if (args.action != null) where.action = args.action;
    if (args.userStatus != null) {
      where.user = { contentViolationStatus: args.userStatus };
    }
    if (args.hasRecipient === true) {
      where.recipientUserId = { not: null };
    }
    const [rows, total] = await Promise.all([
      this.prisma.userContentViolation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: args.limit,
        skip: args.offset,
        include: {
          user: {
            select: {
              email: true,
              contentViolationStatus: true,
              contentViolationMutedUntil: true,
              profile: { select: { nickname: true } },
            },
          },
          recipient: {
            select: {
              email: true,
              profile: { select: { nickname: true } },
            },
          },
        },
      }),
      this.prisma.userContentViolation.count({ where }),
    ]);
    return { rows, total };
  }

  async findBlockedUsersForAdmin(args: {
    limit: number;
    offset: number;
  }): Promise<{ rows: AdminBlockedUserRow[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      contentViolationStatus: { in: [...BLOCKED_STATUSES] },
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: args.limit,
        skip: args.offset,
        select: {
          id: true,
          email: true,
          contentViolationStatus: true,
          contentViolationMutedUntil: true,
          contentViolationCount: true,
          profile: { select: { nickname: true } },
          contentViolations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              surface: true,
              category: true,
              flaggedText: true,
              score: true,
              action: true,
              createdAt: true,
              conversationId: true,
              recipientUserId: true,
              recipient: {
                select: {
                  email: true,
                  profile: { select: { nickname: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total };
  }
}
