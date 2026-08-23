/** Cursor helpers for conversations list pagination (no Nest imports). */

export type ConversationListCursorPayload = {
  unreadCount: number;
  matchedAt: string;
  id: string;
};

export type ConversationListItemForCursor = {
  id: string;
  matchedAt: string;
  unreadCount: number;
};

export function encodeConversationListCursor(
  cursor: ConversationListCursorPayload,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeConversationListCursor(
  raw: string,
): ConversationListCursorPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<ConversationListCursorPayload>;
    if (
      typeof parsed.unreadCount !== 'number' ||
      !Number.isFinite(parsed.unreadCount) ||
      typeof parsed.matchedAt !== 'string' ||
      !parsed.matchedAt ||
      typeof parsed.id !== 'string' ||
      !parsed.id
    ) {
      return null;
    }
    return {
      unreadCount: parsed.unreadCount,
      matchedAt: parsed.matchedAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

export function conversationListCursorFromItem(
  item: ConversationListItemForCursor,
): ConversationListCursorPayload {
  return {
    unreadCount: item.unreadCount,
    matchedAt: item.matchedAt,
    id: item.id,
  };
}

/** True if `item` sorts strictly after `cursor` (unread DESC, matchedAt DESC, id ASC). */
export function isAfterConversationListCursor(
  item: ConversationListItemForCursor,
  cursor: ConversationListCursorPayload,
): boolean {
  if (item.unreadCount !== cursor.unreadCount) {
    return item.unreadCount < cursor.unreadCount;
  }
  if (item.matchedAt !== cursor.matchedAt) {
    return item.matchedAt < cursor.matchedAt;
  }
  return item.id > cursor.id;
}

export function paginateConversationList<T extends ConversationListItemForCursor>(
  items: T[],
  cursor: ConversationListCursorPayload | null,
  limit: number,
): { page: T[]; nextCursor: string | null; hasMore: boolean } {
  let start = 0;
  if (cursor) {
    start = items.findIndex((m) => isAfterConversationListCursor(m, cursor));
    if (start < 0) {
      return { page: [], nextCursor: null, hasMore: false };
    }
  }
  const page = items.slice(start, start + limit);
  const hasMore = start + limit < items.length;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeConversationListCursor(conversationListCursorFromItem(last))
      : null;
  return { page, nextCursor, hasMore };
}
