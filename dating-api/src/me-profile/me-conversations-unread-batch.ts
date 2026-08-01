import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/** One inbox row’s unread filter inputs (matches `unreadMessageCountWhere`). */
export type UnreadCountSpec = {
  conversationId: string;
  otherUserId: string;
  lastReadAt: Date | null;
};

export const UNREAD_COUNT_BATCH_SIZE = 200;

type UnreadCountRawRow = {
  conversationId: string;
  cnt: number;
};

/**
 * Batch unread message counts for many conversations in one (or chunked) SQL round-trip.
 * Semantics match per-row `message.count` with peer SENT + optional lastReadAt.
 */
export async function batchUnreadCountsByConversationId(
  prisma: Pick<PrismaService, '$queryRaw'>,
  specs: readonly UnreadCountSpec[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (specs.length === 0) {
    return out;
  }

  for (let i = 0; i < specs.length; i += UNREAD_COUNT_BATCH_SIZE) {
    const chunk = specs.slice(i, i + UNREAD_COUNT_BATCH_SIZE);
    const chunkMap = await unreadCountsChunk(prisma, chunk);
    for (const [id, n] of chunkMap) {
      out.set(id, n);
    }
  }
  return out;
}

async function unreadCountsChunk(
  prisma: Pick<PrismaService, '$queryRaw'>,
  specs: readonly UnreadCountSpec[],
): Promise<Map<string, number>> {
  const conversationIds = specs.map((s) => s.conversationId);
  const otherUserIds = specs.map((s) => s.otherUserId);
  const lastReadAts = specs.map((s) => s.lastReadAt);

  const rows = await prisma.$queryRaw<UnreadCountRawRow[]>(Prisma.sql`
    SELECT m."conversationId" AS "conversationId", COUNT(*)::int AS "cnt"
    FROM "Message" m
    INNER JOIN (
      SELECT *
      FROM UNNEST(
        ${conversationIds}::text[],
        ${otherUserIds}::text[],
        ${lastReadAts}::timestamptz[]
      ) AS t("conversationId", "otherUserId", "lastReadAt")
    ) AS v
      ON m."conversationId" = v."conversationId"
     AND m."senderId" = v."otherUserId"
     AND m.status = 'SENT'::"MessageStatus"
     AND (v."lastReadAt" IS NULL OR m."createdAt" > v."lastReadAt")
    GROUP BY m."conversationId"
  `);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.conversationId, Number(row.cnt));
  }
  return map;
}
