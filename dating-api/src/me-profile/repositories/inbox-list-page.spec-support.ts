import {
  isAfterConversationListCursor,
  paginateConversationList,
  type ConversationListCursorPayload,
} from '../me-conversations-list-cursor';
import type { InboxListPageRow } from './conversation.repository.types';

export type InboxListFixture = {
  id: string;
  userId1: string;
  userId2: string;
  matchedAt: Date;
  user1LastReadAt?: Date | null;
  user2LastReadAt?: Date | null;
  unreadCount?: number;
};

export function isInboxListPageSql(sqlText: string): boolean {
  return /\bWITH inbox\b/i.test(sqlText) && /\bFROM inbox\b/i.test(sqlText);
}

export function isLastMessageBatchSql(sqlText: string): boolean {
  return (
    sqlText.includes('DISTINCT ON') &&
    (sqlText.includes('"Message"') || sqlText.includes(' FROM "Message"'))
  );
}

export function isUnreadBatchSql(sqlText: string): boolean {
  return sqlText.includes('UNNEST');
}

export function buildSortedInboxRows(
  fixtures: readonly InboxListFixture[],
): InboxListPageRow[] {
  const rows: InboxListPageRow[] = fixtures.map((fixture) => ({
    id: fixture.id,
    userId1: fixture.userId1,
    userId2: fixture.userId2,
    matchedAt: fixture.matchedAt,
    user1LastReadAt: fixture.user1LastReadAt ?? null,
    user2LastReadAt: fixture.user2LastReadAt ?? null,
    unreadCount: fixture.unreadCount ?? 0,
  }));
  rows.sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aTime = a.matchedAt.getTime();
    const bTime = b.matchedAt.getTime();
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return a.id.localeCompare(b.id);
  });
  return rows;
}

/** Raw SQL row set (limit+1 when hasMore) for mocked `$queryRaw`. */
export function inboxListPageSqlRows(
  fixtures: readonly InboxListFixture[],
  cursor: ConversationListCursorPayload | null,
  limit: number,
): InboxListPageRow[] {
  const allRows = buildSortedInboxRows(fixtures);
  const items = allRows.map((row) => ({
    id: row.id,
    matchedAt: row.matchedAt.toISOString(),
    unreadCount: row.unreadCount,
  }));
  let start = 0;
  if (cursor) {
    start = items.findIndex((item) =>
      isAfterConversationListCursor(item, cursor),
    );
    if (start < 0) {
      return [];
    }
  }
  return allRows.slice(start, start + limit + 1);
}

export function parseInboxListPageArgs(sql: {
  strings?: readonly string[];
  values?: unknown[];
}): { cursor: ConversationListCursorPayload | null; limit: number } {
  const values = sql.values ?? [];
  const limitPlusOne = Number(values[values.length - 1]);
  const limit = limitPlusOne - 1;
  const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';

  if (!sqlText.includes('"unreadCount" <')) {
    return { cursor: null, limit };
  }

  const cursorValues = values.slice(-7, -1);
  const unreadCount = Number(cursorValues[0]);
  const matchedAtRaw = cursorValues[2];
  const matchedAt =
    matchedAtRaw instanceof Date
      ? matchedAtRaw.toISOString()
      : String(matchedAtRaw);
  const id = String(cursorValues[5]);

  return {
    cursor: { unreadCount, matchedAt, id },
    limit,
  };
}

export function paginateInboxFixtures(
  fixtures: readonly InboxListFixture[],
  cursor: ConversationListCursorPayload | null,
  limit: number,
): { rows: InboxListPageRow[]; hasMore: boolean } {
  const allRows = buildSortedInboxRows(fixtures);
  const items = allRows.map((row) => ({
    id: row.id,
    matchedAt: row.matchedAt.toISOString(),
    unreadCount: row.unreadCount,
  }));
  const { page, hasMore } = paginateConversationList(items, cursor, limit);
  const rows = page.map((item) => allRows.find((row) => row.id === item.id)!);
  return { rows, hasMore };
}

export type ConversationsQueryRawMockOptions = {
  inboxFixtures?: readonly InboxListFixture[];
  unreadBatchRows?: Array<{ conversationId: string; cnt: number }>;
  lastMessageRows?: Array<{
    conversationId: string;
    text: string;
    senderId: string;
    createdAt: Date;
  }>;
};

export function createConversationsQueryRawMock(
  options: ConversationsQueryRawMockOptions = {},
) {
  return async (sql: {
    strings?: readonly string[];
    values?: unknown[];
  }): Promise<unknown[]> => {
    const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
    if (isLastMessageBatchSql(sqlText)) {
      return options.lastMessageRows ?? [];
    }
    if (isInboxListPageSql(sqlText)) {
      const { cursor, limit } = parseInboxListPageArgs(sql);
      return inboxListPageSqlRows(options.inboxFixtures ?? [], cursor, limit);
    }
    if (isUnreadBatchSql(sqlText)) {
      return options.unreadBatchRows ?? [];
    }
    return [];
  };
}
