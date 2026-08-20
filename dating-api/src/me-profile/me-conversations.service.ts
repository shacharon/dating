import { Inject, Injectable } from '@nestjs/common';
import {
  MessageStatus,
  MutualMatchStatus,
  ProfileGender,
  Prisma,
} from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { AnalyticsService } from '../analytics/analytics.service';
import { hashConversationId } from '../analytics/hash-conversation-id';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import type { MeConversationsListQuery } from './dto/me-conversations-list-query.dto';
import { DEFAULT_CONVERSATION_LIST_LIMIT } from './dto/me-conversations-list-query.dto';
import {
  ConversationForbiddenError,
  ConversationListInvalidCursorError,
  ConversationNotFoundError,
} from './me-conversations.errors';
import {
  decodeConversationListCursor,
  paginateConversationList,
} from './me-conversations-list-cursor';
import { batchUnreadCountsByConversationId } from './me-conversations-unread-batch';
import { batchLastMessagesByConversationId } from './me-conversations-last-message-batch';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
} from '../workers/match-list-rank.ports';

function deriveAgeYears(birthDate: Date | null, asOf: Date): number | null {
  if (!birthDate) return null;
  const t = birthDate.getTime();
  if (Number.isNaN(t) || t > asOf.getTime()) return null;
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const monthDiff = asOf.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && asOf.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export interface ConversationOtherUserDto {
  id: string;
  profileId: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  photoUrl: string | null;
}

export interface ConversationLastMessageDto {
  text: string;
  senderId: string;
  /** ISO-8601 from Message.createdAt */
  sentAt: string;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
  lastMessage: ConversationLastMessageDto | null;
}

export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ConversationsUnreadTotalDto {
  totalUnread: number;
}

export interface ConversationDetailDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  status: 'ACTIVE';
  lastReadAt: string | null;
}

export interface MarkConversationReadResponseDto {
  lastReadAt: string;
}

const profileSelect = {
  id: true,
  userId: true,
  nickname: true,
  gender: true,
  birthDate: true,
  city: true,
  country: true,
  locationLabel: true,
  desiredPartnerGenders: true,
  photos: {
    where: { status: 'APPROVED' as const },
    select: { id: true, isPrimary: true },
  },
} as const;

type ConversationProfileRow = {
  id: string;
  userId: string;
  nickname: string | null;
  gender: ProfileGender;
  birthDate: Date | null;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
  photos: ReadonlyArray<{ id: string; isPrimary: boolean }>;
};

type MutualMatchListRow = {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: Date;
  user1LastReadAt: Date | null;
  user2LastReadAt: Date | null;
};

@Injectable()
export class MeConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
  ) {}

  async list(
    sessionUserId: string,
    query: MeConversationsListQuery = {
      limit: DEFAULT_CONVERSATION_LIST_LIMIT,
    },
  ): Promise<ConversationListResponseDto> {
    const limit =
      typeof query.limit === 'number' &&
      Number.isFinite(query.limit) &&
      query.limit >= 1
        ? Math.min(query.limit, 50)
        : DEFAULT_CONVERSATION_LIST_LIMIT;
    const cursor =
      query.cursor != null && query.cursor.trim() !== ''
        ? decodeConversationListCursor(query.cursor.trim())
        : null;
    if (query.cursor != null && query.cursor.trim() !== '' && cursor == null) {
      throw new ConversationListInvalidCursorError();
    }

    const rows = await this.prisma.mutualMatch.findMany({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: sessionUserId }, { userId2: sessionUserId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId1: true,
        userId2: true,
        createdAt: true,
        user1LastReadAt: true,
        user2LastReadAt: true,
      },
    });

    if (rows.length === 0) {
      this.obs.trace(
        `me conversations list userId=${sessionUserId} count=0`,
        ErrorCodes.ME_CONVERSATIONS_LIST_OK,
      );
      return { conversations: [], nextCursor: null, hasMore: false };
    }

    const unreadSpecs = rows.map((row) => {
      const otherUserId =
        row.userId1 === sessionUserId ? row.userId2 : row.userId1;
      return {
        conversationId: row.id,
        otherUserId,
        lastReadAt: lastReadAtForUser(row, sessionUserId),
      };
    });
    const unreadByConversationId = await batchUnreadCountsByConversationId(
      this.prisma,
      unreadSpecs,
    );

    type Ranked = {
      id: string;
      matchedAt: string;
      unreadCount: number;
      otherUserId: string;
    };

    const ranked: Ranked[] = rows.map((row) => {
      const otherUserId =
        row.userId1 === sessionUserId ? row.userId2 : row.userId1;
      return {
        id: row.id,
        matchedAt: row.createdAt.toISOString(),
        unreadCount: unreadByConversationId.get(row.id) ?? 0,
        otherUserId,
      };
    });

    ranked.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      if (a.matchedAt !== b.matchedAt) {
        return b.matchedAt.localeCompare(a.matchedAt);
      }
      // Lexicographic id ASC — must match isAfterConversationListCursor.
      return a.id.localeCompare(b.id);
    });

    const { page, nextCursor, hasMore } = paginateConversationList(
      ranked,
      cursor,
      limit,
    );

    if (page.length === 0) {
      this.obs.trace(
        `me conversations list userId=${sessionUserId} count=0 page`,
        ErrorCodes.ME_CONVERSATIONS_LIST_OK,
      );
      return { conversations: [], nextCursor: null, hasMore: false };
    }

    const otherUserIds = page.map((p) => p.otherUserId);
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: otherUserIds } },
      select: profileSelect,
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));
    const asOf = new Date();

    const lastByConversationId = await batchLastMessagesByConversationId(
      this.prisma,
      page.map((p) => p.id),
    );

    const conversations: ConversationListItemDto[] = page.map((item) => {
      const profile = profileByUserId.get(item.otherUserId);
      const last = lastByConversationId.get(item.id);
      return {
        id: item.id,
        otherUser: buildOtherUserDto(
          item.otherUserId,
          profile ?? undefined,
          asOf,
        ),
        matchedAt: item.matchedAt,
        unreadCount: item.unreadCount,
        lastMessage: last
          ? {
              text: last.text,
              senderId: last.senderId,
              sentAt: last.createdAt.toISOString(),
            }
          : null,
      };
    });

    this.obs.trace(
      `me conversations list userId=${sessionUserId} count=${conversations.length} hasMore=${hasMore}`,
      ErrorCodes.ME_CONVERSATIONS_LIST_OK,
    );

    return { conversations, nextCursor, hasMore };
  }

  async unreadTotal(
    sessionUserId: string,
  ): Promise<ConversationsUnreadTotalDto> {
    const rows = await this.prisma.mutualMatch.findMany({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: sessionUserId }, { userId2: sessionUserId }],
      },
      select: {
        id: true,
        userId1: true,
        userId2: true,
        user1LastReadAt: true,
        user2LastReadAt: true,
      },
    });

    if (rows.length === 0) {
      return { totalUnread: 0 };
    }

    const unreadSpecs = rows.map((row) => {
      const otherUserId =
        row.userId1 === sessionUserId ? row.userId2 : row.userId1;
      return {
        conversationId: row.id,
        otherUserId,
        lastReadAt: lastReadAtForUser(row, sessionUserId),
      };
    });
    const unreadByConversationId = await batchUnreadCountsByConversationId(
      this.prisma,
      unreadSpecs,
    );

    let totalUnread = 0;
    for (const row of rows) {
      totalUnread += unreadByConversationId.get(row.id) ?? 0;
    }
    return { totalUnread };
  }

  async assertActiveConversationParticipant(
    sessionUserId: string,
    conversationId: string,
  ): Promise<{
    id: string;
    userId1: string;
    userId2: string;
    createdAt: Date;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  }> {
    const match = await this.prisma.mutualMatch.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        userId1: true,
        userId2: true,
        createdAt: true,
        status: true,
        user1LastReadAt: true,
        user2LastReadAt: true,
      },
    });

    if (!match || match.status !== MutualMatchStatus.ACTIVE) {
      throw new ConversationNotFoundError();
    }

    if (match.userId1 !== sessionUserId && match.userId2 !== sessionUserId) {
      throw new ConversationForbiddenError();
    }

    return {
      id: match.id,
      userId1: match.userId1,
      userId2: match.userId2,
      createdAt: match.createdAt,
      user1LastReadAt: match.user1LastReadAt,
      user2LastReadAt: match.user2LastReadAt,
    };
  }

  async getById(
    sessionUserId: string,
    conversationId: string,
  ): Promise<ConversationDetailDto> {
    const match = await this.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const otherUserId =
      match.userId1 === sessionUserId ? match.userId2 : match.userId1;

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: otherUserId },
      select: profileSelect,
    });

    const asOf = new Date();

    this.obs.trace(
      `me conversations detail id=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_DETAIL_OK,
    );

    this.analytics.track(sessionUserId, ProductAnalyticsEvents.CONVERSATION_OPENED, {
      conversationIdHash: hashConversationId(conversationId),
    });

    return {
      id: match.id,
      otherUser: buildOtherUserDto(otherUserId, profile ?? undefined, asOf),
      matchedAt: match.createdAt.toISOString(),
      status: 'ACTIVE',
      lastReadAt: lastReadAtIsoForUser(match, sessionUserId),
    };
  }

  async markAsRead(
    sessionUserId: string,
    conversationId: string,
  ): Promise<MarkConversationReadResponseDto> {
    const match = await this.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const field = lastReadFieldForUser(match.userId1, sessionUserId);
    const now = new Date();

    await this.prisma.mutualMatch.update({
      where: { id: conversationId },
      data: { [field]: now },
    });

    this.obs.trace(
      `me conversations mark-read id=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_MARK_READ_OK,
    );

    return { lastReadAt: now.toISOString() };
  }

  async countUnreadForParticipant(
    sessionUserId: string,
    conversationId: string,
  ): Promise<number> {
    const match = await this.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    return this.countUnreadForMatchRow(sessionUserId, match);
  }

  private async countUnreadForMatchRow(
    sessionUserId: string,
    row: MutualMatchListRow,
  ): Promise<number> {
    const otherUserId =
      row.userId1 === sessionUserId ? row.userId2 : row.userId1;
    const lastReadAt = lastReadAtForUser(row, sessionUserId);

    return this.prisma.message.count({
      where: unreadMessageCountWhere(row.id, otherUserId, lastReadAt),
    });
  }

  async unmatch(
    sessionUserId: string,
    conversationId: string,
  ): Promise<void> {
    const match = await this.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    await this.prisma.mutualMatch.update({
      where: { id: conversationId },
      data: {
        status: MutualMatchStatus.UNMATCHED,
        unmatchedAt: new Date(),
        unmatchedByUserId: sessionUserId,
      },
    });

    await this.matchListRankQueue.enqueueRebuild(match.userId1, 'unmatch');
    await this.matchListRankQueue.enqueueRebuild(match.userId2, 'unmatch');

    this.obs.trace(
      `me conversations unmatch id=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_UNMATCH_OK,
    );
  }
}

function buildOtherUserDto(
  otherUserId: string,
  profile: ConversationProfileRow | undefined,
  asOf: Date,
): ConversationOtherUserDto {
  const photoId = pickApprovedPrimaryPhotoId(profile?.photos ?? []);

  return {
    id: otherUserId,
    profileId: profile?.id ?? '',
    nickname: profile?.nickname?.trim() ? profile.nickname.trim() : null,
    gender: profile ? String(profile.gender) : null,
    ageYears: profile
      ? deriveAgeYears(profile.birthDate ?? null, asOf)
      : null,
    locationLabel: profile?.locationLabel ?? null,
    photoUrl:
      profile?.id && photoId
        ? `/api/v1/me/matches/${profile.id}/photos/${photoId}/file`
        : null,
  };
}

function pickApprovedPrimaryPhotoId(
  photos: ReadonlyArray<{ id: string; isPrimary: boolean }>,
): string | null {
  const primary = photos.find((p) => p.isPrimary);
  return primary?.id ?? null;
}

function unreadMessageCountWhere(
  conversationId: string,
  otherUserId: string,
  lastReadAt: Date | null,
): Prisma.MessageWhereInput {
  return {
    conversationId,
    senderId: otherUserId,
    status: MessageStatus.SENT,
    ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
  };
}

function lastReadFieldForUser(
  userId1: string,
  sessionUserId: string,
): 'user1LastReadAt' | 'user2LastReadAt' {
  return userId1 === sessionUserId ? 'user1LastReadAt' : 'user2LastReadAt';
}

function lastReadAtForUser(
  match: {
    userId1: string;
    userId2: string;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  },
  sessionUserId: string,
): Date | null {
  return match.userId1 === sessionUserId
    ? match.user1LastReadAt
    : match.user2LastReadAt;
}

function lastReadAtIsoForUser(
  match: {
    userId1: string;
    userId2: string;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  },
  sessionUserId: string,
): string | null {
  const at = lastReadAtForUser(match, sessionUserId);
  return at?.toISOString() ?? null;
}
