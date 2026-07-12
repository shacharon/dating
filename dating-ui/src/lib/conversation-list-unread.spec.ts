import { describe, it, expect } from 'vitest';
import {
  incrementUnreadForConversation,
  sortConversationsUnreadFirst,
} from './conversation-list-unread';
import type { ConversationListItemDto } from '@/lib/conversations-api';

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
  return { id, otherUser, matchedAt, unreadCount };
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
});
