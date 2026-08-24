import type { ConversationListItemDto } from '@/lib/api/conversations-api';
import { conversationPrimaryLabel } from '@/app/dating/conversations/conversation-display';

export type ConversationFilterType = 'all' | 'unread' | 'recent';
export type ConversationSortBy = 'recent' | 'alphabetical';

export type ConversationListControls = {
  searchQuery: string;
  filterType: ConversationFilterType;
  sortBy: ConversationSortBy;
};

export const CONVERSATION_LIST_CONTROLS_STORAGE_KEY =
  'dating.conversations.listControls.v1';

const DAY_MS = 24 * 60 * 60 * 1000;

const FILTER_TYPES = new Set<ConversationFilterType>([
  'all',
  'unread',
  'recent',
]);
const SORT_VALUES = new Set<ConversationSortBy>(['recent', 'alphabetical']);

export function conversationActivityMs(
  item: ConversationListItemDto,
): number | null {
  const iso = item.lastMessage?.sentAt ?? item.matchedAt;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function matchesSearch(
  item: ConversationListItemDto,
  searchQuery: string,
): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  return conversationPrimaryLabel(item.otherUser).toLowerCase().includes(q);
}

function matchesFilter(
  item: ConversationListItemDto,
  filterType: ConversationFilterType,
  nowMs: number,
): boolean {
  if (filterType === 'all') return true;
  if (filterType === 'unread') return item.unreadCount > 0;
  const activity = conversationActivityMs(item);
  if (activity === null) return false;
  return nowMs - activity <= DAY_MS;
}

function compareById(
  a: ConversationListItemDto,
  b: ConversationListItemDto,
): number {
  return a.id.localeCompare(b.id);
}

/**
 * Client-side filter → sort pipeline for the conversations inbox.
 * Does not mutate `items` (copies before sort).
 */
export function filterAndSortConversations(
  items: readonly ConversationListItemDto[],
  controls: ConversationListControls,
  options?: { nowMs?: number; locale?: string },
): ConversationListItemDto[] {
  const nowMs = options?.nowMs ?? Date.now();
  const locale = options?.locale ?? 'en';

  const filtered = items.filter(
    (item) =>
      matchesSearch(item, controls.searchQuery) &&
      matchesFilter(item, controls.filterType, nowMs),
  );

  const sorted = [...filtered];
  if (controls.sortBy === 'alphabetical') {
    sorted.sort((a, b) => {
      const byLabel = conversationPrimaryLabel(a.otherUser).localeCompare(
        conversationPrimaryLabel(b.otherUser),
        locale,
        { sensitivity: 'base' },
      );
      return byLabel !== 0 ? byLabel : compareById(a, b);
    });
  } else {
    sorted.sort((a, b) => {
      const aMs = conversationActivityMs(a) ?? 0;
      const bMs = conversationActivityMs(b) ?? 0;
      if (bMs !== aMs) return bMs - aMs;
      return compareById(a, b);
    });
  }

  return sorted;
}

export function parseStoredConversationListControls(
  raw: string | null,
): ConversationListControls | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConversationListControls>;
    if (
      typeof parsed.searchQuery !== 'string' ||
      !FILTER_TYPES.has(parsed.filterType as ConversationFilterType) ||
      !SORT_VALUES.has(parsed.sortBy as ConversationSortBy)
    ) {
      return null;
    }
    return {
      searchQuery: parsed.searchQuery,
      filterType: parsed.filterType as ConversationFilterType,
      sortBy: parsed.sortBy as ConversationSortBy,
    };
  } catch {
    return null;
  }
}

export const DEFAULT_CONVERSATION_LIST_CONTROLS: ConversationListControls = {
  searchQuery: '',
  filterType: 'all',
  sortBy: 'recent',
};
