import { describe, it, expect } from 'vitest';
import { bumpUnreadTotal, sumUnreadCounts } from '@/lib/conversation-unread-total';
import type { ConversationListItemDto } from '@/lib/conversations-api';

const item = (unreadCount: number): ConversationListItemDto => ({
  id: `conv_${unreadCount}`,
  matchedAt: '2026-06-01T10:00:00.000Z',
  unreadCount,
  lastMessage: null,
  otherUser: {
    id: 'user_peer',
    profileId: 'prof_peer',
    nickname: 'Noa',
    gender: 'FEMALE',
    ageYears: 30,
    locationLabel: 'Tel Aviv',
    photoUrl: null,
  },
});

describe('conversation-unread-total', () => {
  it('sumUnreadCounts adds row unread counts', () => {
    expect(sumUnreadCounts([item(2), item(1)])).toBe(3);
  });

  it('bumpUnreadTotal increments total by one', () => {
    expect(bumpUnreadTotal(2, 'conv_1')).toBe(3);
  });
});
