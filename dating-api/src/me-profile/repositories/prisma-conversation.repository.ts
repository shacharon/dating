import { Injectable } from '@nestjs/common';
import {
  MessageStatus,
  MutualMatchStatus,
  Prisma,
  type PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IConversationRepository } from './conversation.repository';
import type { ConversationListCursorPayload } from '../me-conversations-list-cursor';
import type {
  ActiveMatchRow,
  ConversationProfileRow,
  InboxListPageResult,
  LastMessageRow,
  MatchRow,
  MessageRow,
  UnreadCountSpec,
} from './conversation.repository.types';
import { queryInboxListPage } from './inbox-list-page.query';

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

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  text: true,
  createdAt: true,
  status: true,
} as const;

export const UNREAD_COUNT_BATCH_SIZE = 200;
export const LAST_MESSAGE_BATCH_SIZE = 50;

type QueryRawClient = Pick<PrismaClient, '$queryRaw'>;

export async function batchUnreadCountsByConversationId(
  prisma: QueryRawClient,
  specs: readonly UnreadCountSpec[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < specs.length; i += UNREAD_COUNT_BATCH_SIZE) {
    const chunk = specs.slice(i, i + UNREAD_COUNT_BATCH_SIZE);
    const rows = await prisma.$queryRaw<
      Array<{ conversationId: string; cnt: number }>
    >(Prisma.sql`
      SELECT m."conversationId" AS "conversationId", COUNT(*)::int AS "cnt"
      FROM "Message" m
      INNER JOIN (
        SELECT *
        FROM UNNEST(
          ${chunk.map((s) => s.conversationId)}::text[],
          ${chunk.map((s) => s.otherUserId)}::text[],
          ${chunk.map((s) => s.lastReadAt)}::timestamptz[]
        ) AS t("conversationId", "otherUserId", "lastReadAt")
      ) AS v
        ON m."conversationId" = v."conversationId"
       AND m."senderId" = v."otherUserId"
       AND m.status = 'SENT'::"MessageStatus"
       AND (v."lastReadAt" IS NULL OR m."createdAt" > v."lastReadAt")
      GROUP BY m."conversationId"
    `);
    for (const row of rows) out.set(row.conversationId, Number(row.cnt));
  }
  return out;
}

export async function batchLastMessagesByConversationId(
  prisma: QueryRawClient,
  conversationIds: readonly string[],
): Promise<Map<string, LastMessageRow>> {
  const out = new Map<string, LastMessageRow>();
  const uniqueIds = [
    ...new Set(conversationIds.filter((id) => id.trim() !== '')),
  ];
  for (let i = 0; i < uniqueIds.length; i += LAST_MESSAGE_BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + LAST_MESSAGE_BATCH_SIZE);
    const rows = await prisma.$queryRaw<LastMessageRow[]>(Prisma.sql`
      SELECT DISTINCT ON (m."conversationId")
        m."conversationId", m."text", m."senderId", m."createdAt"
      FROM "Message" m
      WHERE m."conversationId" IN (${Prisma.join(chunk)})
        AND m.status = 'SENT'::"MessageStatus"
      ORDER BY m."conversationId", m."createdAt" DESC, m."id" DESC
    `);
    for (const row of rows) {
      out.set(row.conversationId, {
        ...row,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt
            : new Date(row.createdAt),
      });
    }
  }
  return out;
}

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  listInboxPage(args: {
    sessionUserId: string;
    cursor: ConversationListCursorPayload | null;
    limit: number;
  }): Promise<InboxListPageResult> {
    return queryInboxListPage(this.prisma, args);
  }

  findActiveMatchesForUser(userId: string): Promise<ActiveMatchRow[]> {
    return this.prisma.mutualMatch.findMany({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: userId }, { userId2: userId }],
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
  }

  findMatchById(conversationId: string): Promise<MatchRow | null> {
    return this.prisma.mutualMatch.findUnique({
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
  }

  async updateLastReadAt(
    conversationId: string,
    field: 'user1LastReadAt' | 'user2LastReadAt',
    at: Date,
  ): Promise<void> {
    await this.prisma.mutualMatch.update({
      where: { id: conversationId },
      data: { [field]: at },
    });
  }

  async markUnmatched(
    conversationId: string,
    byUserId: string,
    at: Date,
  ): Promise<void> {
    await this.prisma.mutualMatch.update({
      where: { id: conversationId },
      data: {
        status: MutualMatchStatus.UNMATCHED,
        unmatchedAt: at,
        unmatchedByUserId: byUserId,
      },
    });
  }

  findProfilesByUserIds(userIds: string[]): Promise<ConversationProfileRow[]> {
    return this.prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: profileSelect,
    });
  }

  findProfileByUserId(userId: string): Promise<ConversationProfileRow | null> {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      select: profileSelect,
    });
  }

  batchUnreadCounts(specs: UnreadCountSpec[]): Promise<Map<string, number>> {
    return batchUnreadCountsByConversationId(this.prisma, specs);
  }

  countUnreadMessages(args: {
    conversationId: string;
    otherUserId: string;
    lastReadAt: Date | null;
  }): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversationId: args.conversationId,
        senderId: args.otherUserId,
        status: MessageStatus.SENT,
        ...(args.lastReadAt ? { createdAt: { gt: args.lastReadAt } } : {}),
      },
    });
  }

  batchLastMessagesByConversationIds(
    conversationIds: string[],
  ): Promise<Map<string, LastMessageRow>> {
    return batchLastMessagesByConversationId(this.prisma, conversationIds);
  }

  findSentMessageCursor(
    conversationId: string,
    messageId: string,
  ): Promise<{ id: string; createdAt: Date } | null> {
    return this.prisma.message.findFirst({
      where: { id: messageId, conversationId, status: MessageStatus.SENT },
      select: { id: true, createdAt: true },
    });
  }

  listSentMessagesAfterCursor(args: {
    conversationId: string;
    cursor: { id: string; createdAt: Date };
    limit: number;
  }): Promise<MessageRow[]> {
    return this.prisma.message.findMany({
      where: {
        conversationId: args.conversationId,
        status: MessageStatus.SENT,
        OR: [
          { createdAt: { gt: args.cursor.createdAt } },
          { createdAt: args.cursor.createdAt, id: { gt: args.cursor.id } },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: args.limit,
      select: messageSelect,
    });
  }

  listSentMessagesHistory(args: {
    conversationId: string;
    limit: number;
    beforeCursor?: { id: string; createdAt: Date };
  }): Promise<MessageRow[]> {
    return this.prisma.message.findMany({
      where: {
        conversationId: args.conversationId,
        status: MessageStatus.SENT,
        ...(args.beforeCursor
          ? {
              OR: [
                { createdAt: { lt: args.beforeCursor.createdAt } },
                {
                  createdAt: args.beforeCursor.createdAt,
                  id: { lt: args.beforeCursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: args.limit + 1,
      select: messageSelect,
    });
  }

  createSentMessage(args: {
    conversationId: string;
    senderId: string;
    text: string;
  }): Promise<MessageRow> {
    return this.prisma.message.create({
      data: { ...args, status: MessageStatus.SENT },
      select: messageSelect,
    });
  }
}
