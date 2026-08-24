import { describe, it, expect } from 'vitest';
import {
  applyIncomingMessageToConversationList,
  incrementUnreadForConversation,
  sortConversationsUnreadFirst,
} from './conversation-list-unread';
import type { ConversationListItemDto } from '@/lib/api/conversations-api';

const otherUser = {
  id: 'user_other',
  profileId: 'prof_1',
  nickname: 'Noa',
  gender: 'FEMALE',
  ageYears: 30,
  locationLabel: null,
  photoUrl: null,
};

function row(
  id: string,
  unreadCount: number,
  matchedAt: string,
): ConversationListItemDto {
  return { id, otherUser, matchedAt, unreadCount, lastMessage: null };
}

describe('conversation-list-unread', () => {
  it('sorts by unreadCount desc then matchedAt desc', () => {
    const sorted = sortConversationsUnreadFirst([
      row('a', 0, '2026-05-31T10:00:00.000Z'),
      row('b', 2, '2026-05-31T12:00:00.000Z'),
      row('c', 2, '2026-05-31T14:00:00.000Z'),
    ]);

    expect(sorted.map((c) => c.id)).toEqual(['c', 'b', 'a']);
  });

  it('increments unread and re-sorts', () => {
    const result = incrementUnreadForConversation(
      [
        row('read', 0, '2026-05-31T14:00:00.000Z'),
        row('unread', 1, '2026-05-31T10:00:00.000Z'),
      ],
      'read',
    );

    expect(result[0].id).toBe('read');
    expect(result[0].unreadCount).toBe(1);
    expect(result[1].id).toBe('unread');
  });

  it('returns unchanged when conversation id is missing', () => {
    const items = [row('only', 0, '2026-05-31T10:00:00.000Z')];
    expect(incrementUnreadForConversation(items, 'missing')).toBe(items);
  });

  it('applies lastMessage and optionally bumps unread', () => {
    const items = [
      row('read', 0, '2026-05-31T14:00:00.000Z'),
      row('other', 1, '2026-05-31T10:00:00.000Z'),
    ];
    const result = applyIncomingMessageToConversationList(
      items,
      {
        conversationId: 'read',
        senderId: 'user_peer',
        text: 'hello preview',
        createdAt: '2026-08-01T15:00:00.000Z',
      },
      { bumpUnread: true },
    );

    expect(result[0].id).toBe('read');
    expect(result[0].unreadCount).toBe(1);
    expect(result[0].lastMessage).toEqual({
      text: 'hello preview',
      senderId: 'user_peer',
      sentAt: '2026-08-01T15:00:00.000Z',
    });
  });

  it('updates preview without bumping unread for own messages', () => {
    const items = [row('c1', 0, '2026-05-31T14:00:00.000Z')];
    const result = applyIncomingMessageToConversationList(
      items,
      {
        conversationId: 'c1',
        senderId: 'user_me',
        text: 'my send',
        createdAt: '2026-08-01T16:00:00.000Z',
      },
      { bumpUnread: false },
    );

    expect(result[0].unreadCount).toBe(0);
    expect(result[0].lastMessage?.text).toBe('my send');
  });
});
