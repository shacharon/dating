import { describe, it, expect } from 'vitest';
import {
  buildPeerLabelIndex,
  resolvePeerLabel,
} from '@/lib/messaging/message-toast-labels';
import type { ConversationListItemDto } from '@/lib/api/conversations-api';

const listItem = (
  overrides: Partial<ConversationListItemDto> = {},
): ConversationListItemDto => ({
  id: 'conv_1',
  matchedAt: '2026-06-01T10:00:00.000Z',
  unreadCount: 0,
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
  ...overrides,
});

describe('message-toast-labels', () => {
  it('buildPeerLabelIndex maps other user id to display label', () => {
    const index = buildPeerLabelIndex([listItem()]);
    expect(index.get('user_peer')).toBe('Noa');
  });

  it('resolvePeerLabel falls back to Someone when sender is unknown', () => {
    const index = buildPeerLabelIndex([]);
    expect(resolvePeerLabel(index, 'user_unknown')).toBe('Someone');
  });
});
