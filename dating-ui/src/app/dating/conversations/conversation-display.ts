import type { ConversationListItemDto, ConversationOtherUserDto } from '@/lib/conversations-api';

function metaParts(
  gender: string | null,
  ageYears: number | null,
  locationLabel: string | null,
): string[] {
  return [
    gender,
    ageYears != null ? `${ageYears}y` : null,
    locationLabel,
  ].filter((part): part is string => Boolean(part));
}

export function conversationPrimaryLabel(
  otherUser: ConversationOtherUserDto,
): string {
  const nickname = otherUser.nickname?.trim();
  if (nickname) return nickname;
  return metaParts(
    otherUser.gender,
    otherUser.ageYears,
    otherUser.locationLabel,
  ).join(' · ');
}

export function conversationSecondaryMeta(
  otherUser: ConversationOtherUserDto,
): string | null {
  if (!otherUser.nickname?.trim()) return null;
  const meta = metaParts(
    otherUser.gender,
    otherUser.ageYears,
    otherUser.locationLabel,
  ).join(' · ');
  return meta || null;
}

export function formatMatchedAt(matchedAt: string): string {
  const date = new Date(matchedAt);
  if (Number.isNaN(date.getTime())) return matchedAt;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) {
    return `Matched today at ${date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }
  if (diffDays === 1) return 'Matched yesterday';
  if (diffDays < 7) return `Matched ${diffDays} days ago`;
  return `Matched on ${date.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
}

export function formatMatchedOnDate(matchedAt: string): string {
  const date = new Date(matchedAt);
  if (Number.isNaN(date.getTime())) return matchedAt;
  return `Matched on ${date.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const time = formatTimeOfDay(date);
  if (isSameCalendarDay(date, now)) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return `Yesterday ${time}`;

  return `${date.toLocaleDateString(undefined, { dateStyle: 'medium' })} ${time}`;
}

export function conversationListItemLabel(item: ConversationListItemDto): string {
  return conversationPrimaryLabel(item.otherUser);
}
