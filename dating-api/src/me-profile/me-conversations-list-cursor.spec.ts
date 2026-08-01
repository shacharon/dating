import {
  decodeConversationListCursor,
  encodeConversationListCursor,
  isAfterConversationListCursor,
  paginateConversationList,
  type ConversationListCursorPayload,
} from './me-conversations-list-cursor';

describe('me-conversations-list-cursor', () => {
  const items = [
    { id: 'a', matchedAt: '2026-06-02T00:00:00.000Z', unreadCount: 5 },
    { id: 'b', matchedAt: '2026-06-01T00:00:00.000Z', unreadCount: 2 },
    { id: 'c', matchedAt: '2026-05-31T00:00:00.000Z', unreadCount: 2 },
    { id: 'd', matchedAt: '2026-05-30T00:00:00.000Z', unreadCount: 0 },
  ];

  it('round-trips encode/decode', () => {
    const raw = encodeConversationListCursor({
      unreadCount: 2,
      matchedAt: '2026-06-01T00:00:00.000Z',
      id: 'b',
    });
    expect(decodeConversationListCursor(raw)).toEqual({
      unreadCount: 2,
      matchedAt: '2026-06-01T00:00:00.000Z',
      id: 'b',
    });
  });

  it('returns null for invalid cursor', () => {
    expect(decodeConversationListCursor('not-base64')).toBeNull();
    expect(
      decodeConversationListCursor(
        Buffer.from(JSON.stringify({ unreadCount: 1 }), 'utf8').toString(
          'base64url',
        ),
      ),
    ).toBeNull();
  });

  it('paginates with nextCursor and stable concat order', () => {
    const page1 = paginateConversationList(items, null, 2);
    expect(page1.page.map((i) => i.id)).toEqual(['a', 'b']);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();

    const cursor = decodeConversationListCursor(page1.nextCursor!)!;
    const page2 = paginateConversationList(items, cursor, 2);
    expect(page2.page.map((i) => i.id)).toEqual(['c', 'd']);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();

    expect([...page1.page, ...page2.page].map((i) => i.id)).toEqual(
      items.map((i) => i.id),
    );
  });

  it('isAfterConversationListCursor follows unread DESC then matchedAt DESC', () => {
    const cursor: ConversationListCursorPayload = {
      unreadCount: 2,
      matchedAt: '2026-06-01T00:00:00.000Z',
      id: 'b',
    };
    expect(isAfterConversationListCursor(items[0]!, cursor)).toBe(false);
    expect(isAfterConversationListCursor(items[1]!, cursor)).toBe(false);
    expect(isAfterConversationListCursor(items[2]!, cursor)).toBe(true);
  });
});
