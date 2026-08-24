import { MutualMatchStatus, Prisma, type PrismaClient } from '@prisma/client';
import type { ConversationListCursorPayload } from '../me-conversations-list-cursor';
import type { InboxListPageResult, InboxListPageRow } from './conversation.repository.types';

type QueryRawClient = Pick<PrismaClient, '$queryRaw'>;

function normalizeInboxRow(row: InboxListPageRow): InboxListPageRow {
  return {
    ...row,
    matchedAt:
      row.matchedAt instanceof Date ? row.matchedAt : new Date(row.matchedAt),
    user1LastReadAt:
      row.user1LastReadAt == null
        ? null
        : row.user1LastReadAt instanceof Date
          ? row.user1LastReadAt
          : new Date(row.user1LastReadAt),
    user2LastReadAt:
      row.user2LastReadAt == null
        ? null
        : row.user2LastReadAt instanceof Date
          ? row.user2LastReadAt
          : new Date(row.user2LastReadAt),
    unreadCount: Number(row.unreadCount),
  };
}

/** SQL WHERE fragment: row sorts strictly after cursor (unread DESC, matchedAt DESC, id ASC). */
export function inboxListCursorWhereSql(
  cursor: ConversationListCursorPayload,
): Prisma.Sql {
  const cursorMatchedAt = new Date(cursor.matchedAt);
  return Prisma.sql`
    "unreadCount" < ${cursor.unreadCount}
    OR (
      "unreadCount" = ${cursor.unreadCount}
      AND "matchedAt" < ${cursorMatchedAt}::timestamptz
    )
    OR (
      "unreadCount" = ${cursor.unreadCount}
      AND "matchedAt" = ${cursorMatchedAt}::timestamptz
      AND id > ${cursor.id}
    )
  `;
}

export async function queryInboxListPage(
  prisma: QueryRawClient,
  args: {
    sessionUserId: string;
    cursor: ConversationListCursorPayload | null;
    limit: number;
  },
): Promise<InboxListPageResult> {
  const limitPlusOne = args.limit + 1;
  const cursorWhere =
    args.cursor == null
      ? Prisma.sql`TRUE`
      : inboxListCursorWhereSql(args.cursor);

  const rows = await prisma.$queryRaw<InboxListPageRow[]>(Prisma.sql`
    WITH inbox AS (
      SELECT
        mm.id,
        mm."createdAt" AS "matchedAt",
        mm."userId1",
        mm."userId2",
        mm."user1LastReadAt",
        mm."user2LastReadAt",
        (
          SELECT COUNT(*)::int
          FROM "Message" m
          WHERE m."conversationId" = mm.id
            AND m."senderId" = CASE
              WHEN mm."userId1" = ${args.sessionUserId} THEN mm."userId2"
              ELSE mm."userId1"
            END
            AND m.status = 'SENT'::"MessageStatus"
            AND (
              CASE
                WHEN mm."userId1" = ${args.sessionUserId} THEN mm."user1LastReadAt"
                ELSE mm."user2LastReadAt"
              END IS NULL
              OR m."createdAt" > CASE
                WHEN mm."userId1" = ${args.sessionUserId} THEN mm."user1LastReadAt"
                ELSE mm."user2LastReadAt"
              END
            )
        ) AS "unreadCount"
      FROM "MutualMatch" mm
      WHERE mm.status = ${MutualMatchStatus.ACTIVE}::"MutualMatchStatus"
        AND (
          mm."userId1" = ${args.sessionUserId}
          OR mm."userId2" = ${args.sessionUserId}
        )
    )
    SELECT *
    FROM inbox
    WHERE ${cursorWhere}
    ORDER BY "unreadCount" DESC, "matchedAt" DESC, id ASC
    LIMIT ${limitPlusOne}
  `);

  const hasMore = rows.length > args.limit;
  const trimmed = hasMore ? rows.slice(0, args.limit) : rows;

  return {
    rows: trimmed.map(normalizeInboxRow),
    hasMore,
  };
}
