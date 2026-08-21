import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ViolationStats } from '../../content-moderation/content-moderation.types';
import { ContentViolationService } from '../../content-moderation/content-violation.service';
import {
  CONTENT_VIOLATION_REPOSITORY,
  type IContentViolationRepository,
} from '../../content-moderation/repositories/content-violation.repository';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type {
  AdminBlockedUserItemDto,
  ListAdminBlockedUsersResponseDto,
} from './dto/list-admin-blocked-users.dto';
import type {
  AdminContentViolationListItemDto,
  ListAdminContentViolationsResponseDto,
} from './dto/list-admin-content-violations.dto';
import type { UnblockContentViolationResponseDto } from './dto/unblock-content-violation.dto';

const PREVIEW_MAX = 100;

@Injectable()
export class AdminContentViolationsService {
  constructor(
    @Inject(CONTENT_VIOLATION_REPOSITORY)
    private readonly violationRepository: IContentViolationRepository,
    private readonly violations: ContentViolationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async listViolations(filters: {
    surface?: string;
    category?: string;
    userId?: string;
    action?: string;
    userStatus?: string;
    hasRecipient?: boolean;
    limit?: number;
    offset?: number;
    includeFullText?: boolean;
  }): Promise<ListAdminContentViolationsResponseDto> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);
    const includeFullText = filters.includeFullText === true;

    const { rows, total } =
      await this.violationRepository.findViolationsForAdmin({
        surface: filters.surface?.trim() || undefined,
        category: filters.category?.trim() || undefined,
        userId: filters.userId?.trim() || undefined,
        action: filters.action?.trim() || undefined,
        userStatus: filters.userStatus?.trim() || undefined,
        hasRecipient: filters.hasRecipient,
        limit,
        offset,
      });

    const violations: AdminContentViolationListItemDto[] = rows.map((v) => {
      const item: AdminContentViolationListItemDto = {
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
        conversationId: v.conversationId ?? null,
        recipientUserId: v.recipientUserId ?? null,
        recipientEmail: v.recipient?.email ?? null,
        recipientNickname: v.recipient?.profile?.nickname ?? null,
      };
      if (includeFullText) {
        item.flaggedText = v.flaggedText;
      }
      return item;
    });

    return { violations, total, limit, offset };
  }

  async listBlockedUsers(filters: {
    limit?: number;
    offset?: number;
  }): Promise<ListAdminBlockedUsersResponseDto> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);

    const { rows: users, total } =
      await this.violationRepository.findBlockedUsersForAdmin({
        limit,
        offset,
      });

    const mapped: AdminBlockedUserItemDto[] = users.map((u) => {
      const latest = u.contentViolations[0] ?? null;
      return {
        userId: u.id,
        userEmail: u.email,
        userNickname: u.profile?.nickname ?? null,
        userStatus: u.contentViolationStatus,
        userMutedUntil: u.contentViolationMutedUntil
          ? u.contentViolationMutedUntil.toISOString()
          : null,
        violationCount: u.contentViolationCount,
        latestViolation: latest
          ? {
              id: latest.id,
              surface: latest.surface,
              category: latest.category,
              flaggedTextPreview: latest.flaggedText.slice(0, PREVIEW_MAX),
              flaggedText: latest.flaggedText,
              score: latest.score,
              action: latest.action,
              createdAt: latest.createdAt.toISOString(),
              conversationId: latest.conversationId ?? null,
              recipientUserId: latest.recipientUserId ?? null,
              recipientEmail: latest.recipient?.email ?? null,
              recipientNickname: latest.recipient?.profile?.nickname ?? null,
            }
          : null,
      };
    });

    return { users: mapped, total, limit, offset };
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
    const user = await this.violationRepository.getUserViolationFields(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousStatus = user.contentViolationStatus ?? 'ok';

    await this.violationRepository.resetViolationStatus(userId);

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
