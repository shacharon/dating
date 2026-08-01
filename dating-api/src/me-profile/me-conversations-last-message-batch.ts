import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export type LastMessageBatchRow = {
  conversationId: string;
  text: string;
  senderId: string;
  createdAt: Date;
};

export const LAST_MESSAGE_BATCH_SIZE = 50;

type LastMessageRawRow = {
  conversationId: string;
  text: string;
  senderId: string;
  createdAt: Date;
};

/**
 * Batch-fetch the newest SENT message per conversation (page-sized id lists).
 * Uses DISTINCT ON for one round-trip per chunk.
 */
export async function batchLastMessagesByConversationId(
  prisma: Pick<PrismaService, '$queryRaw'>,
  conversationIds: readonly string[],
): Promise<Map<string, LastMessageBatchRow>> {
  const out = new Map<string, LastMessageBatchRow>();
  if (conversationIds.length === 0) {
    return out;
  }

  const uniqueIds = [...new Set(conversationIds.filter((id) => id.trim() !== ''))];
  if (uniqueIds.length === 0) {
    return out;
  }

  for (let i = 0; i < uniqueIds.length; i += LAST_MESSAGE_BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + LAST_MESSAGE_BATCH_SIZE);
    const chunkMap = await lastMessagesChunk(prisma, chunk);
    for (const [id, row] of chunkMap) {
      out.set(id, row);
    }
  }
  return out;
}

async function lastMessagesChunk(
  prisma: Pick<PrismaService, '$queryRaw'>,
  conversationIds: readonly string[],
): Promise<Map<string, LastMessageBatchRow>> {
  const rows = await prisma.$queryRaw<LastMessageRawRow[]>(Prisma.sql`
    SELECT DISTINCT ON (m."conversationId")
      m."conversationId" AS "conversationId",
      m."text" AS "text",
      m."senderId" AS "senderId",
      m."createdAt" AS "createdAt"
    FROM "Message" m
    WHERE m."conversationId" IN (${Prisma.join(conversationIds)})
      AND m.status = 'SENT'::"MessageStatus"
    ORDER BY m."conversationId", m."createdAt" DESC, m."id" DESC
  `);

  const map = new Map<string, LastMessageBatchRow>();
  for (const row of rows) {
    map.set(row.conversationId, {
      conversationId: row.conversationId,
      text: row.text,
      senderId: row.senderId,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt
          : new Date(row.createdAt),
    });
  }
  return map;
}
