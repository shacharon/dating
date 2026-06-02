import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageStatus,
  MutualMatchStatus,
  ProfileGender,
  Prisma,
} from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';

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

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
}

export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
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
  ) {}

  async list(sessionUserId: string): Promise<ConversationListResponseDto> {
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
      return { conversations: [] };
    }

    const otherUserIds = rows.map((row) =>
      row.userId1 === sessionUserId ? row.userId2 : row.userId1,
    );

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: otherUserIds } },
      select: profileSelect,
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    const unreadCounts = await Promise.all(
      rows.map((row) => this.countUnreadForMatchRow(sessionUserId, row)),
    );

    const asOf = new Date();
    const conversations: ConversationListItemDto[] = rows.map((row, index) => {
      const otherUserId =
        row.userId1 === sessionUserId ? row.userId2 : row.userId1;
      const profile = profileByUserId.get(otherUserId);

      return {
        id: row.id,
        otherUser: buildOtherUserDto(
          otherUserId,
          profile ?? undefined,
          asOf,
        ),
        matchedAt: row.createdAt.toISOString(),
        unreadCount: unreadCounts[index] ?? 0,
      };
    });

    conversations.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      return b.matchedAt.localeCompare(a.matchedAt);
    });

    this.obs.trace(
      `me conversations list userId=${sessionUserId} count=${conversations.length}`,
      ErrorCodes.ME_CONVERSATIONS_LIST_OK,
    );

    return { conversations };
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
      throw new NotFoundException({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
    }

    if (match.userId1 !== sessionUserId && match.userId2 !== sessionUserId) {
      throw new ForbiddenException({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
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
    await this.assertActiveConversationParticipant(
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
