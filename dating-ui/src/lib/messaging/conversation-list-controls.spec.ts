import { describe, it, expect } from 'vitest';
import type { ConversationListItemDto } from '@/lib/api/conversations-api';
import {
  DEFAULT_CONVERSATION_LIST_CONTROLS,
  filterAndSortConversations,
  parseStoredConversationListControls,
  type ConversationListControls,
} from './conversation-list-controls';

function item(
  overrides: Partial<ConversationListItemDto> & {
    id: string;
    otherUser?: Partial<ConversationListItemDto['otherUser']>;
  },
): ConversationListItemDto {
  return {
    id: overrides.id,
    matchedAt: overrides.matchedAt ?? '2026-01-01T00:00:00.000Z',
    unreadCount: overrides.unreadCount ?? 0,
    otherUser: {
      id: overrides.otherUser?.id ?? `u-${overrides.id}`,
      profileId: overrides.otherUser?.profileId ?? `p-${overrides.id}`,
      nickname: overrides.otherUser?.nickname ?? null,
      ageYears: overrides.otherUser?.ageYears ?? 30,
      gender: overrides.otherUser?.gender ?? 'woman',
      locationLabel: overrides.otherUser?.locationLabel ?? 'Tel Aviv',
      photoUrl: overrides.otherUser?.photoUrl ?? null,
    },
    lastMessage:
      overrides.lastMessage === undefined ? null : overrides.lastMessage,
  };
}

const NOW = Date.parse('2026-08-01T12:00:00.000Z');

describe('filterAndSortConversations', () => {
  it('searches primary label case-insensitively (including null nickname fallback)', () => {
    const items = [
      item({ id: '1', otherUser: { nickname: 'Alex' } }),
      item({
        id: '2',
        otherUser: {
          nickname: null,
          gender: 'man',
          ageYears: 28,
          locationLabel: 'Haifa',
        },
      }),
      item({ id: '3', otherUser: { nickname: 'Sam' } }),
    ];

    expect(
      filterAndSortConversations(
        items,
        { ...DEFAULT_CONVERSATION_LIST_CONTROLS, searchQuery: 'ale' },
        { nowMs: NOW },
      ).map((c) => c.id),
    ).toEqual(['1']);

    expect(
      filterAndSortConversations(
        items,
        { ...DEFAULT_CONVERSATION_LIST_CONTROLS, searchQuery: 'haifa' },
        { nowMs: NOW },
      ).map((c) => c.id),
    ).toEqual(['2']);
  });

  it('filters unread', () => {
    const items = [
      item({ id: 'a', unreadCount: 0 }),
      item({ id: 'b', unreadCount: 2 }),
    ];
    expect(
      filterAndSortConversations(
        items,
        { ...DEFAULT_CONVERSATION_LIST_CONTROLS, filterType: 'unread' },
        { nowMs: NOW },
      ).map((c) => c.id),
    ).toEqual(['b']);
  });

  it('filters recent within 24h on activity time', () => {
    const items = [
      item({
        id: 'fresh',
        matchedAt: '2026-07-01T00:00:00.000Z',
        lastMessage: {
          text: 'hi',
          senderId: 'u',
          sentAt: '2026-08-01T10:00:00.000Z',
        },
      }),
      item({
        id: 'stale',
        matchedAt: '2026-07-01T00:00:00.000Z',
        lastMessage: {
          text: 'old',
          senderId: 'u',
          sentAt: '2026-07-30T10:00:00.000Z',
        },
      }),
      item({
        id: 'bad',
        matchedAt: 'not-a-date',
      }),
    ];

    expect(
      filterAndSortConversations(
        items,
        { ...DEFAULT_CONVERSATION_LIST_CONTROLS, filterType: 'recent' },
        { nowMs: NOW },
      ).map((c) => c.id),
    ).toEqual(['fresh']);
  });

  it('sorts recent activity desc with id tie-break', () => {
    const items = [
      item({
        id: 'b',
        lastMessage: {
          text: 'x',
          senderId: 'u',
          sentAt: '2026-08-01T08:00:00.000Z',
        },
      }),
      item({
        id: 'a',
        lastMessage: {
          text: 'x',
          senderId: 'u',
          sentAt: '2026-08-01T09:00:00.000Z',
        },
      }),
      item({
        id: 'c',
        lastMessage: {
          text: 'x',
          senderId: 'u',
          sentAt: '2026-08-01T09:00:00.000Z',
        },
      }),
    ];

    expect(
      filterAndSortConversations(items, DEFAULT_CONVERSATION_LIST_CONTROLS, {
        nowMs: NOW,
      }).map((c) => c.id),
    ).toEqual(['a', 'c', 'b']);
  });

  it('sorts alphabetical by primary label with locale', () => {
    const items = [
      item({ id: '2', otherUser: { nickname: 'Zoe' } }),
      item({ id: '1', otherUser: { nickname: 'amy' } }),
    ];
    expect(
      filterAndSortConversations(
        items,
        { ...DEFAULT_CONVERSATION_LIST_CONTROLS, sortBy: 'alphabetical' },
        { nowMs: NOW, locale: 'en' },
      ).map((c) => c.id),
    ).toEqual(['1', '2']);
  });

  it('combines search ∩ filter then sort without mutating input', () => {
    const items = [
      item({
        id: 'keep',
        unreadCount: 1,
        otherUser: { nickname: 'Alex' },
        lastMessage: {
          text: 'x',
          senderId: 'u',
          sentAt: '2026-08-01T11:00:00.000Z',
        },
      }),
      item({
        id: 'drop-name',
        unreadCount: 1,
        otherUser: { nickname: 'Sam' },
      }),
      item({
        id: 'drop-read',
        unreadCount: 0,
        otherUser: { nickname: 'Alexandra' },
      }),
    ];
    const snapshot = items.map((c) => c.id);

    const controls: ConversationListControls = {
      searchQuery: 'alex',
      filterType: 'unread',
      sortBy: 'recent',
    };
    expect(
      filterAndSortConversations(items, controls, { nowMs: NOW }).map(
        (c) => c.id,
      ),
    ).toEqual(['keep']);
    expect(items.map((c) => c.id)).toEqual(snapshot);
  });
});

describe('parseStoredConversationListControls', () => {
  it('returns null for corrupt or incomplete JSON', () => {
    expect(parseStoredConversationListControls(null)).toBeNull();
    expect(parseStoredConversationListControls('{')).toBeNull();
    expect(
      parseStoredConversationListControls(
        JSON.stringify({ searchQuery: 1, filterType: 'all', sortBy: 'recent' }),
      ),
    ).toBeNull();
  });

  it('parses valid controls', () => {
    expect(
      parseStoredConversationListControls(
        JSON.stringify({
          searchQuery: 'alex',
          filterType: 'unread',
          sortBy: 'alphabetical',
        }),
      ),
    ).toEqual({
      searchQuery: 'alex',
      filterType: 'unread',
      sortBy: 'alphabetical',
    });
  });
});
