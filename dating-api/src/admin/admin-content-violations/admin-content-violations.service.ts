import { Injectable, NotFoundException } from '@nestjs/common';
import type { ViolationStats } from '../../content-moderation/content-moderation.types';
import { ContentViolationService } from '../../content-moderation/content-violation.service';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminContentViolationListItemDto,
  ListAdminContentViolationsResponseDto,
} from './dto/list-admin-content-violations.dto';
import type { UnblockContentViolationResponseDto } from './dto/unblock-content-violation.dto';

const PREVIEW_MAX = 100;

@Injectable()
export class AdminContentViolationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly violations: ContentViolationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async listViolations(filters: {
    surface?: string;
    category?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListAdminContentViolationsResponseDto> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);

    const where: {
      surface?: string;
      category?: string;
      userId?: string;
    } = {};
    if (filters.surface?.trim()) where.surface = filters.surface.trim();
    if (filters.category?.trim()) where.category = filters.category.trim();
    if (filters.userId?.trim()) where.userId = filters.userId.trim();

    const [rows, total] = await Promise.all([
      this.prisma.userContentViolation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              email: true,
              contentViolationStatus: true,
              contentViolationMutedUntil: true,
              profile: { select: { nickname: true } },
            },
          },
        },
      }),
      this.prisma.userContentViolation.count({ where }),
    ]);

    const violations: AdminContentViolationListItemDto[] = rows.map((v) => ({
      id: v.id,
      userId: v.userId,
      userEmail: v.user.email,
      userNickname: v.user.profile?.nickname ?? null,
      userStatus: v.user.contentViolationStatus ?? 'ok',
      userMutedUntil: v.user.contentViolationMutedUntil
        ? v.user.contentViolationMutedUntil.toISOString()
        : null,
      surface: v.surface,
      category: v.category,
      flaggedTextPreview: v.flaggedText.slice(0, PREVIEW_MAX),
      score: v.score,
      action: v.action,
      createdAt: v.createdAt.toISOString(),
    }));

    return { violations, total, limit, offset };
  }

  async getStats(): Promise<ViolationStats> {
    return this.violations.getViolationStats();
  }

  async unblockUser(
    adminUserId: string,
    userId: string,
    reason: string,
  ): Promise<UnblockContentViolationResponseDto> {
    const cleanedReason = reason.replace(/\0/g, '').trim().slice(0, 500);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { contentViolationStatus: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousStatus = user.contentViolationStatus ?? 'ok';

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });

    this.obs.trace(
      `admin content unblock userId=${userId} adminUserId=${adminUserId} previousStatus=${previousStatus} reason=${cleanedReason}`,
      ErrorCodes.ADMIN_CONTENT_UNBLOCK,
    );

    return {
      success: true,
      userId,
      previousStatus,
      clearedAt: new Date().toISOString(),
    };
  }
}
